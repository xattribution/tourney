import { TEAMS, PAIRS, MATCHDAY } from '../data/tournament';
import { computeStandings, type Dataset } from '../lib/standings';
import { StandingsTable } from './StandingsTable';
import type { Which } from '../hooks/useTournament';

interface Props {
  group: string;
  dataset: Dataset;
  which: Which;
  onScore: (which: Which, group: string, pairIndex: number, side: 'h' | 'a', value: string) => void;
}

export function GroupCard({ group, dataset, which, onScore }: Props) {
  const st = computeStandings(group, dataset);

  let lastMd = 0;
  return (
    <div className="group-card">
      <div className="group-head">
        <span className="group-badge">{group}</span>
        <span className="lbl">Group {group}</span>
        <span className="meta">{st.playedCount}/6 played</span>
      </div>
      <StandingsTable standings={st} />
      <div className="fixtures">
        {PAIRS.map((p, i) => {
          const md = MATCHDAY[i];
          const showMd = md !== lastMd;
          lastMd = md;
          const home = TEAMS[group][p[0]];
          const away = TEAMS[group][p[1]];
          const sc = dataset.scores[group + '-' + i] || { h: '', a: '' };
          const decided = sc.h !== '' && sc.h != null && sc.a !== '' && sc.a != null;
          const hw = decided && +sc.h > +sc.a;
          const aw = decided && +sc.a > +sc.h;
          return (
            <div key={i}>
              {showMd && <div className="matchday">Matchday {md}</div>}
              <div className={'fx' + (decided ? ' decided' : '')}>
                <span className="side home">
                  <span className={'winmark' + (hw ? ' on' : '')} />
                  <span className="flag">{home.flag}</span>
                  <span className="tn">{home.name}</span>
                </span>
                <span className="score-in">
                  <input
                    className="score-box tnum"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={sc.h ?? ''}
                    aria-label={`${home.name} score`}
                    onChange={(e) => onScore(which, group, i, 'h', e.target.value)}
                  />
                  <span className="vs">–</span>
                  <input
                    className="score-box tnum"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={sc.a ?? ''}
                    aria-label={`${away.name} score`}
                    onChange={(e) => onScore(which, group, i, 'a', e.target.value)}
                  />
                </span>
                <span className="side away">
                  <span className={'winmark' + (aw ? ' on' : '')} />
                  <span className="flag">{away.flag}</span>
                  <span className="tn">{away.name}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
