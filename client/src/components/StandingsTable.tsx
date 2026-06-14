import type { Standings } from '../lib/standings';

const fmtGD = (n: number) => (n > 0 ? '+' : '') + n;

export function StandingsTable({ standings }: { standings: Standings }) {
  return (
    <table className="standings">
      <thead>
        <tr>
          <th className="team-col">Team</th>
          <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.rows.map((r, i) => {
          const cls = i === 0 ? 'q1' : i === 1 ? 'q2' : i === 2 ? 'q3' : '';
          return (
            <tr key={r.team.code} className={cls}>
              <td className="team-col">
                <div className="team-cell">
                  <span className="pos">{i + 1}</span>
                  <span className="flag">{r.team.flag}</span>
                  <span className="tname">{r.team.name}</span>
                </div>
              </td>
              <td className="tnum">{r.P}</td>
              <td className="tnum">{r.W}</td>
              <td className="tnum">{r.D}</td>
              <td className="tnum">{r.L}</td>
              <td className="tnum">{r.GF}</td>
              <td className="tnum">{r.GA}</td>
              <td className="tnum">{fmtGD(r.GD)}</td>
              <td className="tnum pts">{r.Pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
