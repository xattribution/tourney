// Group-stage standings + third-place ranking.
// Ported from the original tracker; same tie-break rules.
import { TEAMS, PAIRS, GROUP_LETTERS, type Team } from '../data/tournament';

export interface Score { h: string; a: string }
export interface Dataset {
  scores: Record<string, Score>; // key `${group}-${pairIndex}`
  ko: Record<number, KoState>;   // key match number
}
export interface KoState { w?: 'a' | 'b'; sa?: string; sb?: string }

export function blankDataset(): Dataset {
  return { scores: {}, ko: {} };
}

export interface Row {
  team: Team;
  P: number; W: number; D: number; L: number;
  GF: number; GA: number; GD: number; Pts: number;
}
export interface Standings {
  rows: Row[];
  complete: boolean;
  playedCount: number;
}

interface PlayedMatch { h: number; a: number; hs: number; as: number }

// Compute standings for a group given a dataset.
export function computeStandings(group: string, ds: Dataset): Standings {
  const teams = TEAMS[group];
  const rows: Row[] = teams.map((t) => ({ team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }));
  const played: PlayedMatch[] = [];
  PAIRS.forEach((p, i) => {
    const sc = ds.scores[group + '-' + i];
    if (sc && sc.h !== '' && sc.h != null && sc.a !== '' && sc.a != null) {
      const hs = +sc.h, as = +sc.a;
      if (Number.isFinite(hs) && Number.isFinite(as)) {
        played.push({ h: p[0], a: p[1], hs, as });
      }
    }
  });
  for (const m of played) {
    const H = rows[m.h], A = rows[m.a];
    H.P++; A.P++; H.GF += m.hs; H.GA += m.as; A.GF += m.as; A.GA += m.hs;
    if (m.hs > m.as) { H.W++; A.L++; H.Pts += 3; }
    else if (m.hs < m.as) { A.W++; H.L++; A.Pts += 3; }
    else { H.D++; A.D++; H.Pts++; A.Pts++; }
  }
  rows.forEach((r) => (r.GD = r.GF - r.GA));
  const complete = played.length === 6;
  rows.sort((x, y) => cmpTeams(x, y, played, rows));
  return { rows, complete, playedCount: played.length };
}

// Comparison: pts, GD, GF, then head-to-head among the equal set, then name.
function cmpTeams(x: Row, y: Row, played: PlayedMatch[], allRows: Row[]): number {
  if (y.Pts !== x.Pts) return y.Pts - x.Pts;
  if (y.GD !== x.GD) return y.GD - x.GD;
  if (y.GF !== x.GF) return y.GF - x.GF;
  const tied = allRows.filter((r) => r.Pts === x.Pts && r.GD === x.GD && r.GF === x.GF);
  if (tied.length > 1) {
    const h2h = miniTable(tied.map((r) => r.team.idx), played);
    const hx = h2h[x.team.idx], hy = h2h[y.team.idx];
    if (hy.Pts !== hx.Pts) return hy.Pts - hx.Pts;
    if (hy.GD !== hx.GD) return hy.GD - hx.GD;
    if (hy.GF !== hx.GF) return hy.GF - hx.GF;
  }
  return x.team.name.localeCompare(y.team.name); // deterministic "drawing of lots"
}

function miniTable(idxs: number[], played: PlayedMatch[]): Record<number, { Pts: number; GD: number; GF: number }> {
  const set = new Set(idxs);
  const t: Record<number, { Pts: number; GD: number; GF: number }> = {};
  idxs.forEach((i) => (t[i] = { Pts: 0, GD: 0, GF: 0 }));
  for (const m of played) {
    if (set.has(m.h) && set.has(m.a)) {
      t[m.h].GF += m.hs; t[m.h].GD += m.hs - m.as;
      t[m.a].GF += m.as; t[m.a].GD += m.as - m.hs;
      if (m.hs > m.as) t[m.h].Pts += 3;
      else if (m.hs < m.as) t[m.a].Pts += 3;
      else { t[m.h].Pts++; t[m.a].Pts++; }
    }
  }
  return t;
}

export interface ThirdRow { group: string; row: Row; complete: boolean; rank?: number }
export interface ThirdsResult {
  ranked: ThirdRow[];
  allComplete: boolean;
  qualifiedGroups: string[];
}

// Rank the 12 third-placed teams.
export function rankThirds(_ds: Dataset, standingsCache: Record<string, Standings>): ThirdsResult {
  const thirds: ThirdRow[] = [];
  let allComplete = true;
  for (const g of GROUP_LETTERS) {
    const st = standingsCache[g];
    if (!st.complete) allComplete = false;
    thirds.push({ group: g, row: st.rows[2], complete: st.complete });
  }
  const ranked = [...thirds].sort((a, b) => {
    if (b.row.Pts !== a.row.Pts) return b.row.Pts - a.row.Pts;
    if (b.row.GD !== a.row.GD) return b.row.GD - a.row.GD;
    if (b.row.GF !== a.row.GF) return b.row.GF - a.row.GF;
    return a.row.team.name.localeCompare(b.row.team.name);
  });
  ranked.forEach((r, i) => (r.rank = i + 1));
  const qualifiedGroups = allComplete ? ranked.slice(0, 8).map((r) => r.group) : [];
  return { ranked, allComplete, qualifiedGroups };
}
