import { describe, expect, it } from 'vitest';
import { createMatch } from '../rules';
import { playOut } from '../ai';

const PAT = 'PAT-G-001';
const WCH = 'WCH-G-001';

function runMany(n: number, gods: [string, string]) {
  const results = [] as { winner: number; turns: number }[];
  for (let i = 0; i < n; i++) {
    const s = playOut(createMatch({ gods, ai: [true, true], seed: 1000 + i }));
    results.push({ winner: s.winner ?? -1, turns: s.turn });
  }
  return results;
}

describe('AI 대 AI 헤드리스 대전', () => {
  it('인내 vs 마녀 — 모든 판이 끝난다', () => {
    const r = runMany(60, [PAT, WCH]);
    const avgTurns = r.reduce((a, x) => a + x.turns, 0) / r.length / 2;
    const patWins = r.filter((x) => x.winner === 0).length / r.length;
    console.log(`[PAT vs WCH] 평균 ${avgTurns.toFixed(1)}턴/인, 인내 승률 ${(patWins * 100).toFixed(0)}%`);
    expect(r.every((x) => x.winner === 0 || x.winner === 1)).toBe(true);
  });

  it('미러전도 끝난다', () => {
    for (const g of [PAT, WCH]) {
      const r = runMany(15, [g, g]);
      const avgTurns = r.reduce((a, x) => a + x.turns, 0) / r.length / 2;
      console.log(`[${g} 미러] 평균 ${avgTurns.toFixed(1)}턴/인`);
      expect(r.every((x) => x.winner === 0 || x.winner === 1)).toBe(true);
    }
  });
});
