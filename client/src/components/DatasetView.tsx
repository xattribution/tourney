import { GROUP_LETTERS } from '../data/tournament';
import { computeStandings, type Dataset } from '../lib/standings';
import { GroupCard } from './GroupCard';
import { ThirdsPanel } from './ThirdsPanel';
import type { Which } from '../hooks/useTournament';

interface Props {
  which: Which;
  dataset: Dataset;
  onScore: (which: Which, group: string, pairIndex: number, side: 'h' | 'a', value: string) => void;
  onCopy: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

const COPY: Record<Which, { eyebrow: string; title: string; blurb: string; copyLabel: string }> = {
  actual: {
    eyebrow: 'Real data · official results',
    title: 'Matches & Standings',
    blurb: 'Enter actual scores as matches are played. Standings, the third-place race, and the Actual bracket all recalculate automatically. Enter results in any order.',
    copyLabel: 'Copy results → Predictor',
  },
  predict: {
    eyebrow: 'Sandbox · what-if',
    title: 'Predictor',
    blurb: 'Your own scenario, fully independent from real results. Enter scores to game out the group stage — leave a match level (e.g. 1–1) and it counts as a draw. Feeds the Predicted bracket.',
    copyLabel: 'Pull in current results',
  },
};

export function DatasetView({ which, dataset, onScore, onCopy, onExport, onImport, onReset }: Props) {
  const meta = COPY[which];
  let totalPlayed = 0;
  for (const g of GROUP_LETTERS) totalPlayed += computeStandings(g, dataset).playedCount;

  return (
    <section className="view">
      <div className="view-intro">
        <p className="eyebrow">{meta.eyebrow}</p>
        <h2>{meta.title}</h2>
        <p>{meta.blurb}</p>
      </div>
      <div className="toolbar">
        <button className="btn solid" onClick={onCopy}>{meta.copyLabel}</button>
        <button className="btn ghost" onClick={onExport}>Export JSON</button>
        <button className="btn ghost" onClick={onImport}>Import JSON</button>
        <button className="btn ghost" onClick={onReset}>Reset</button>
        <span className="progress">{totalPlayed} / 72 group games</span>
      </div>
      <div className="groups-grid">
        {GROUP_LETTERS.map((g) => (
          <GroupCard key={g} group={g} dataset={dataset} which={which} onScore={onScore} />
        ))}
      </div>
      <ThirdsPanel dataset={dataset} />
    </section>
  );
}
