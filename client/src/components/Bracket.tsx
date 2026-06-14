import { useMemo } from 'react';
import { ROUNDS, GROUP_LETTERS, type Team } from '../data/tournament';
import { resolveBracket, type ResolvedBracket, type ResolvedMatch } from '../lib/bracket';
import type { Dataset } from '../lib/standings';

interface Props {
  dataset: Dataset;
  scale: number;
  highlight: string | null;
  onPick: (no: number, side: 'a' | 'b') => void;
  onScore: (no: number, side: 'a' | 'b') => void;
}

function Slot({
  team, label, isWin, side, no, score, highlight, onPick, onScore,
}: {
  team: Team | null; label: string; isWin: boolean; side: 'a' | 'b';
  no: number; score: number | null; highlight: string | null;
  onPick: (no: number, side: 'a' | 'b') => void;
  onScore: (no: number, side: 'a' | 'b') => void;
}) {
  if (!team) {
    return (
      <div className="slot empty" onClick={() => onPick(no, side)}>
        <span className="flag">·</span>
        <span className="nm">{label}</span>
        <span className="sc" />
      </div>
    );
  }
  const hl = highlight && team.code === highlight ? ' hl' : '';
  return (
    <div
      className={'slot' + (isWin ? ' win' : '') + hl}
      onClick={() => onPick(no, side)}
      onDoubleClick={() => onScore(no, side)}
    >
      <span className="flag">{team.flag}</span>
      <span className="nm">{team.name}</span>
      <span className="sc tnum">{score != null ? score : ''}</span>
    </div>
  );
}

function Tie({
  no, R, highlight, onPick, onScore,
}: {
  no: number; R: ResolvedBracket; highlight: string | null;
  onPick: (no: number, side: 'a' | 'b') => void;
  onScore: (no: number, side: 'a' | 'b') => void;
}) {
  const r: ResolvedMatch = R.res[no];
  const aWin = r.winnerSide === 'a';
  const bWin = r.winnerSide === 'b';
  const isDraw = r.isDraw && !r.winnerSide;
  return (
    <div className={'tie' + (no === 104 ? ' champion' : '')} data-tie={no}>
      <span className="mno">M{no}</span>
      <Slot team={r.a} label={r.aLabel} isWin={aWin} side="a" no={no} score={r.sa} highlight={highlight} onPick={onPick} onScore={onScore} />
      <Slot team={r.b} label={r.bLabel} isWin={bWin} side="b" no={no} score={r.sb} highlight={highlight} onPick={onPick} onScore={onScore} />
      {isDraw && <div className="draw-note">Level — tap a team to set who advances (PK)</div>}
    </div>
  );
}

export function Bracket({ dataset, scale, highlight, onPick, onScore }: Props) {
  const R = useMemo(() => resolveBracket(dataset), [dataset]);

  const status = useMemo(() => {
    if (!R.thirds.allComplete) {
      const remaining = GROUP_LETTERS.filter((g) => !R.standings[g].complete).length;
      return `Round of 32 locks when all groups are complete · ${remaining} group${remaining === 1 ? '' : 's'} to finish`;
    }
    const done = Object.values(R.res).filter((m) => m.winner).length;
    return `${done}/32 knockout results in`;
  }, [R]);

  return (
    <>
      <span className="progress" style={{ marginLeft: 0, marginBottom: 6, display: 'block' }}>{status}</span>
      <div className="bracket-wrap">
        <div className="bracket" style={{ ['--scale' as string]: scale }}>
          {ROUNDS.map((round) => (
            <div className="round" key={round.label}>
              <div className="round-label">{round.label}</div>
              {round.label === 'Final' ? (
                <div className="final-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
                  <Tie no={104} R={R} highlight={highlight} onPick={onPick} onScore={onScore} />
                  <div className="champ-card">
                    <div className="eyebrow">Champion</div>
                    {R.res[104]?.winner ? (
                      <>
                        <span className="flag">{R.res[104].winner!.flag}</span>
                        <div className="cn">{R.res[104].winner!.name}</div>
                      </>
                    ) : (
                      <div className="placeholder">— to be decided —</div>
                    )}
                  </div>
                  <div>
                    <div className="round-label" style={{ marginTop: 6 }}>Third place</div>
                    <Tie no={103} R={R} highlight={highlight} onPick={onPick} onScore={onScore} />
                  </div>
                </div>
              ) : (
                round.nums.map((no) => (
                  <Tie key={no} no={no} R={R} highlight={highlight} onPick={onPick} onScore={onScore} />
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
