import { useCallback, useEffect, useRef, useState } from 'react';
import { useTournament, type Which } from './hooks/useTournament';
import { useLocalPref } from './hooks/useLocalPref';
import { resolveBracket } from './lib/bracket';
import { blankDataset, type Dataset } from './lib/standings';
import { DatasetView } from './components/DatasetView';
import { Bracket } from './components/Bracket';
import { Toast, type ToastMsg } from './components/Toast';

type View = 'results' | 'predict' | 'bracket';

export default function App() {
  const { state, status, mutate, replaceDataset } = useTournament();
  const [view, setView] = useLocalPref<View>('wc26_view', 'results');
  const [theme, setTheme] = useLocalPref<'light' | 'dark'>('wc26_theme', 'light');
  const [bracketSource, setBracketSource] = useLocalPref<Which>('wc26_src', 'actual');
  const [scale, setScale] = useLocalPref<number>('wc26_scale', 1);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const toastN = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const importTarget = useRef<Which>('actual');

  const notify = useCallback((text: string) => {
    toastN.current += 1;
    setToast({ text, key: toastN.current });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ----- group score entry -----
  const onScore = useCallback((which: Which, group: string, i: number, side: 'h' | 'a', raw: string) => {
    const v = raw.replace(/[^0-9]/g, '').slice(0, 2);
    mutate((s) => {
      const ds = s[which];
      const key = group + '-' + i;
      if (!ds.scores[key]) ds.scores[key] = { h: '', a: '' };
      ds.scores[key][side] = v;
    });
  }, [mutate]);

  // ----- bracket pick (tap to advance) -----
  const onPick = useCallback((no: number, side: 'a' | 'b') => {
    const ds = state[bracketSource];
    const R = resolveBracket(ds);
    const r = R.res[no];
    const team = side === 'a' ? r.a : r.b;
    if (!team) { setHighlight(null); return; }
    if (r.winnerSide === side) {
      setHighlight((h) => (h === team.code ? null : team.code));
      return;
    }
    setHighlight(null);
    mutate((s) => {
      const d = s[bracketSource];
      if (!d.ko[no]) d.ko[no] = {};
      d.ko[no].w = side;
    });
  }, [state, bracketSource, mutate]);

  // ----- bracket score entry (double-tap a slot) -----
  const onKoScore = useCallback((no: number, side: 'a' | 'b') => {
    const ds = state[bracketSource];
    const cur = ds.ko[no] ? (side === 'a' ? ds.ko[no].sa : ds.ko[no].sb) : '';
    const v = window.prompt('Score for this team in M' + no + ':', cur != null ? cur : '');
    if (v === null) return;
    const n = v.replace(/[^0-9]/g, '');
    mutate((s) => {
      const d = s[bracketSource];
      if (!d.ko[no]) d.ko[no] = {};
      if (side === 'a') d.ko[no].sa = n; else d.ko[no].sb = n;
    });
  }, [state, bracketSource, mutate]);

  // ----- toolbar actions -----
  const copyToPredict = useCallback(() => {
    mutate((s) => { s.predict = structuredClone(s.actual); });
    setView('predict');
    notify('Results copied into Predictor');
  }, [mutate, setView, notify]);

  const resetDataset = useCallback((which: Which) => {
    if (!confirm('Reset all ' + (which === 'actual' ? 'results' : 'predictions') + '? This clears scores and knockout picks for this dataset.')) return;
    replaceDataset(which, blankDataset());
    notify((which === 'actual' ? 'Results' : 'Predictions') + ' reset');
  }, [replaceDataset, notify]);

  const resetKo = useCallback(() => {
    if (!confirm('Clear manual knockout picks for the ' + bracketSource + ' bracket? Group results stay; only your tap-to-advance choices and KO scores are cleared.')) return;
    mutate((s) => { s[bracketSource].ko = {}; });
    setHighlight(null);
    notify('Knockout picks cleared');
  }, [bracketSource, mutate, notify]);

  // ----- JSON export / import -----
  const exportJSON = useCallback((which: Which) => {
    const data = { format: 'wc26', dataset: which, exportedAt: new Date().toISOString(), payload: state[which] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wc26-' + which + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Exported ' + which + ' JSON');
  }, [state, notify]);

  const importJSON = useCallback((which: Which) => {
    importTarget.current = which;
    fileInput.current?.click();
  }, []);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        const payload = obj.payload || obj;
        const ds: Dataset = blankDataset();
        if (payload.scores && typeof payload.scores === 'object') ds.scores = payload.scores;
        if (payload.ko && typeof payload.ko === 'object') ds.ko = payload.ko;
        replaceDataset(importTarget.current, ds);
        notify('Imported into ' + importTarget.current);
      } catch {
        alert('Could not read that file — expected WC26 JSON export.');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  }, [replaceDataset, notify]);

  const zoom = useCallback((delta: number) => {
    setScale(Math.min(1.4, Math.max(0.5, Math.round((scale + delta) * 10) / 10)));
  }, [scale, setScale]);

  const syncClass =
    status === 'ok' ? 'ok' : status === 'saving' ? 'saving' : status === 'offline' ? 'offline' : '';
  const syncTitle =
    status === 'ok' ? 'Synced' : status === 'saving' ? 'Saving…' : status === 'offline' ? 'Offline — changes saved locally' : 'Loading…';

  return (
    <>
      <header>
        <div className="head-row">
          <div className="wordmark">
            <span className="pitch" aria-hidden="true">
              <svg viewBox="0 0 30 30" width="30" height="30">
                <rect x="1" y="1" width="28" height="28" rx="5" fill="none" stroke="var(--line-strong)" strokeWidth="1.4" />
                <line x1="15" y1="1" x2="15" y2="29" stroke="var(--line-strong)" strokeWidth="1.2" />
                <circle cx="15" cy="15" r="6" fill="none" stroke="var(--line-strong)" strokeWidth="1.2" />
                <circle cx="15" cy="15" r="1.4" fill="var(--ink-3)" />
              </svg>
            </span>
            <span>
              <div className="wm-title">WC26</div>
              <div className="wm-sub">Road to the Final</div>
            </span>
          </div>
          <span className="hosts" title="Hosts: Canada · Mexico · USA">🇨🇦&nbsp;🇲🇽&nbsp;🇺🇸</span>
          <span className="spacer" />
          <span className={'sync-dot ' + syncClass} title={syncTitle} />
          <button className="icon-btn" title="Toggle theme" aria-label="Toggle light/dark"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>◐</button>
        </div>
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" aria-selected={view === 'results'} onClick={() => setView('results')}>Matches &amp; Standings</button>
          <button className="tab" role="tab" aria-selected={view === 'predict'} onClick={() => setView('predict')}>Predictor</button>
          <button className="tab" role="tab" aria-selected={view === 'bracket'} onClick={() => setView('bracket')}>Bracket</button>
        </div>
      </header>

      <main>
        {view === 'results' && (
          <DatasetView which="actual" dataset={state.actual} onScore={onScore}
            onCopy={copyToPredict} onExport={() => exportJSON('actual')} onImport={() => importJSON('actual')} onReset={() => resetDataset('actual')} />
        )}
        {view === 'predict' && (
          <DatasetView which="predict" dataset={state.predict} onScore={onScore}
            onCopy={copyToPredict} onExport={() => exportJSON('predict')} onImport={() => importJSON('predict')} onReset={() => resetDataset('predict')} />
        )}
        {view === 'bracket' && (
          <section className="view">
            <div className="view-intro">
              <p className="eyebrow">Knockout · 32 → 1</p>
              <h2>Bracket</h2>
              <p>Auto-built from group standings using FIFA's official third-place allocation. Tap a team to send them through; double-tap a team to enter a knockout score. The Round of 32 fills in once each group is complete.</p>
            </div>
            <div className="bracket-tools">
              <div className="seg" role="group" aria-label="Bracket data source">
                <button aria-pressed={bracketSource === 'actual'} onClick={() => { setBracketSource('actual'); setHighlight(null); }}>Actual</button>
                <button aria-pressed={bracketSource === 'predict'} onClick={() => { setBracketSource('predict'); setHighlight(null); }}>Predicted</button>
              </div>
              <div className="zoom">
                <button aria-label="Zoom out" onClick={() => zoom(-0.1)}>−</button>
                <span className="z-mid tnum">{Math.round(scale * 100)}%</span>
                <button aria-label="Zoom in" onClick={() => zoom(0.1)}>+</button>
              </div>
              <button className="btn btn-sm ghost" onClick={resetKo}>Reset knockout picks</button>
            </div>
            <Bracket dataset={state[bracketSource]} scale={scale} highlight={highlight} onPick={onPick} onScore={onKoScore} />
          </section>
        )}
      </main>

      <Toast toast={toast} />
      <input ref={fileInput} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} />
    </>
  );
}
