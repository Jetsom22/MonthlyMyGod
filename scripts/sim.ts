// 밸런스 시뮬 — AI 대 AI 전 매치업 표. `npm run sim` (판 수: npm run sim -- 40)
import { playOut } from '../src/engine/ai';
import { GODS } from '../src/engine/db';
import { createMatch } from '../src/engine/rules';

const N = Number(process.argv[2] ?? 20);
const gods = GODS.filter((g) => g.playable);
const label = (id: string) => gods.find((g) => g.id === id)!.character;

console.log(`매치업당 ${N}판 (선후공 반반) — 행 기준 승률 / 평균 턴(1인 기준)\n`);
const header = ['', ...gods.map((g) => g.character)].map((x) => x.padEnd(8)).join('');
console.log(header);
const overall: Record<string, { w: number; n: number }> = {};
for (const a of gods) {
  let row = label(a.id).padEnd(8);
  for (const b of gods) {
    let wins = 0;
    let turns = 0;
    let stuck = 0;
    for (let i = 0; i < N; i++) {
      const s = playOut(createMatch({ gods: [a.id, b.id], ai: [true, true], seed: 9000 + i, first: (i % 2) as 0 | 1 }));
      if (s.winner === null) stuck++;
      if (s.winner === 0) wins++;
      turns += s.turn / 2;
    }
    if (a.id !== b.id) {
      overall[a.id] ??= { w: 0, n: 0 };
      overall[a.id].w += wins;
      overall[a.id].n += N;
    }
    row += `${Math.round((wins / N) * 100)}%/${(turns / N).toFixed(0)}${stuck ? '!' : ''}`.padEnd(8);
  }
  console.log(row);
}
console.log('\n전체 승률 (미러 제외)');
for (const g of gods) console.log(`  ${g.character.padEnd(4)} ${Math.round((overall[g.id].w / overall[g.id].n) * 100)}%`);
