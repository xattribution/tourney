// Knockout bracket resolution.
// Ported from the original tracker; resolves every match from group standings,
// the FIFA third-place ANNEX allocation, and any manual knockout picks/scores.
import {
  GROUP_LETTERS, KO, ANNEX, T_SLOT_ORDER, T_SLOT_INDEX,
  type KoRef, type Team,
} from '../data/tournament';
import {
  computeStandings, rankThirds,
  type Dataset, type Standings, type ThirdsResult,
} from './standings';

export interface ResolvedMatch {
  a: Team | null;
  b: Team | null;
  winner: Team | null;
  loser: Team | null;
  winnerSide: 'a' | 'b' | null;
  aLabel: string;
  bLabel: string;
  sa: number | null;
  sb: number | null;
  isDraw: boolean;
}
export interface ResolvedBracket {
  standings: Record<string, Standings>;
  thirds: ThirdsResult;
  res: Record<number, ResolvedMatch>;
  tAssign: Record<string, string> | null;
}

export function resolveBracket(ds: Dataset): ResolvedBracket {
  const standings: Record<string, Standings> = {};
  for (const g of GROUP_LETTERS) standings[g] = computeStandings(g, ds);
  const thirds = rankThirds(ds, standings);

  // Map winner-slot group -> source group whose 3rd-placed team fills it.
  let tAssign: Record<string, string> | null = null;
  if (thirds.allComplete) {
    const key = [...thirds.qualifiedGroups].sort().join('');
    const out = ANNEX[key];
    if (out) {
      tAssign = {};
      for (const slotG of T_SLOT_ORDER) {
        tAssign[slotG] = out[T_SLOT_INDEX[slotG]];
      }
    }
  }

  const res: Record<number, ResolvedMatch> = {};
  function teamFromRef(ref: KoRef): Team | null {
    if ('W' in ref && ref.W) { const st = standings[ref.W]; return st.complete ? st.rows[0].team : null; }
    if ('R' in ref && ref.R) { const st = standings[ref.R]; return st.complete ? st.rows[1].team : null; }
    if ('T' in ref && ref.T) {
      if (!tAssign) return null;
      const srcGroup = tAssign[ref.T]; if (!srcGroup) return null;
      const st = standings[srcGroup]; return st.complete ? st.rows[2].team : null;
    }
    if ('WM' in ref && ref.WM != null) { const r = res[ref.WM]; return r ? r.winner : null; }
    if ('LM' in ref && ref.LM != null) { const r = res[ref.LM]; return r ? r.loser : null; }
    return null;
  }
  function labelFromRef(ref: KoRef): string {
    if ('W' in ref) return 'Winner Group ' + ref.W;
    if ('R' in ref) return 'Runner-up ' + ref.R;
    if ('T' in ref) return '3rd Place';
    if ('WM' in ref) return 'Winner M' + ref.WM;
    if ('LM' in ref) return 'Loser M' + ref.LM;
    return '';
  }

  // Ascending match order works because dependencies are always lower-numbered.
  for (const m of KO) {
    const a = teamFromRef(m.a), b = teamFromRef(m.b);
    const koState = ds.ko[m.no] || {};
    let winnerSide: 'a' | 'b' | null = null;
    const sa = koState.sa, sb = koState.sb;
    const hasScores = sa !== '' && sa != null && sb !== '' && sb != null && Number.isFinite(+sa) && Number.isFinite(+sb);
    if (koState.w === 'a' || koState.w === 'b') winnerSide = koState.w;
    else if (hasScores && +sa! !== +sb!) winnerSide = +sa! > +sb! ? 'a' : 'b';

    let winner: Team | null = null, loser: Team | null = null;
    if (winnerSide === 'a') { winner = a; loser = b; }
    else if (winnerSide === 'b') { winner = b; loser = a; }
    if (winner == null) { winner = null; loser = null; winnerSide = null; }

    res[m.no] = {
      a, b, winner, loser, winnerSide,
      aLabel: labelFromRef(m.a), bLabel: labelFromRef(m.b),
      sa: hasScores ? +sa! : null,
      sb: hasScores ? +sb! : null,
      isDraw: !!(hasScores && +sa! === +sb!),
    };
  }
  return { standings, thirds, res, tAssign };
}

// Remove manual KO winners that have become invalid (their team is now missing)
// after an upstream change. Mutates and returns the dataset.
export function cleanupDownstream(ds: Dataset): Dataset {
  let changed = true, guard = 0;
  while (changed && guard < 10) {
    changed = false; guard++;
    const R = resolveBracket(ds);
    for (const m of KO) {
      const ks = ds.ko[m.no];
      if (ks && ks.w) {
        const r = R.res[m.no];
        const team = ks.w === 'a' ? r.a : r.b;
        if (!team) { delete ks.w; changed = true; }
      }
    }
  }
  return ds;
}
