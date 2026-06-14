import { GROUP_LETTERS } from '../data/tournament';
import { computeStandings, rankThirds, type Dataset, type Standings } from '../lib/standings';

const fmtGD = (n: number) => (n > 0 ? '+' : '') + n;

export function ThirdsPanel({ dataset }: { dataset: Dataset }) {
  const standings: Record<string, Standings> = {};
  for (const g of GROUP_LETTERS) standings[g] = computeStandings(g, dataset);
  const t = rankThirds(dataset, standings);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Third-place race</h3>
        <span className="hint">
          {t.allComplete ? 'Top 8 qualify' : 'Ranks once all 12 groups are complete'}
        </span>
      </div>
      <table className="thirds">
        <thead>
          <tr>
            <th>#</th><th className="l">Team</th><th>Grp</th><th>Pts</th><th>GD</th><th>GF</th><th />
          </tr>
        </thead>
        <tbody>
          {t.ranked.map((r, i) => {
            const inTop = t.allComplete && i < 8;
            const cls = !t.allComplete ? '' : inTop ? 'in' : 'out';
            return (
              <tr key={r.row.team.code} className={cls}>
                <td className="rank tnum">{i + 1}</td>
                <td className="l">
                  <div className="team-cell">
                    <span className="flag">{r.row.team.flag}</span>
                    <span className="tname">{r.row.team.name}</span>
                  </div>
                </td>
                <td>{r.group}</td>
                <td className="tnum">{r.row.Pts}</td>
                <td className="tnum">{fmtGD(r.row.GD)}</td>
                <td className="tnum">{r.row.GF}</td>
                <td>
                  {inTop ? <span className="qtag">In</span> : t.allComplete ? <span className="qtag">Out</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
