import { describe, expect, it } from 'vitest';
import { playOut } from '../ai';
import { GODS } from '../db';
import { createMatch } from '../rules';

const playable = GODS.filter((g) => g.playable).map((g) => g.id);

describe('AI 대 AI 헤드리스 대전', () => {
  it('다섯 신 모든 매치업이 끝난다 (미러 포함)', () => {
    const lines: string[] = [];
    for (const a of playable) {
      for (const b of playable) {
        if (b < a) continue;
        let turns = 0;
        for (let i = 0; i < 3; i++) {
          const s = playOut(createMatch({ gods: [a, b], ai: [true, true], seed: 2000 + i, first: (i % 2) as 0 | 1 }));
          expect(s.winner === 0 || s.winner === 1).toBe(true);
          turns += s.turn / 2;
        }
        lines.push(`${a.slice(0, 3)} vs ${b.slice(0, 3)}: 평균 ${(turns / 3).toFixed(1)}턴/인`);
      }
    }
    console.log(lines.join('\n'));
  });
});
