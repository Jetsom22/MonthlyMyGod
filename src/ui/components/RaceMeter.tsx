// 강림 레이스 — 두 소환자의 전체 진행도를 나란히. 상대 체력이 아니라 "누가 먼저 완주하나".
import { god, progress, stageName } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import { GOD_GLYPH } from '../art';
import './RaceMeter.css';

export function RaceMeter({ s, bottomSeat }: { s: GameState; bottomSeat: 0 | 1 }) {
  const order = [bottomSeat, bottomSeat === 0 ? 1 : 0] as const;
  return (
    <div className="race" aria-label="강림 레이스">
      <div className="race__title display">강림 레이스</div>
      <div className="race__lanes">
        {order.map((seat) => {
          const p = s.players[seat];
          const g = god(p);
          const th = g.track.thresholds;
          const total = th.reduce((a, b) => a + b, 0);
          let acc = 0;
          const marks = th.slice(0, -1).map((t) => (acc += t) / total);
          const pct = progress(p) * 100;
          return (
            <div key={seat} className="race__lane" data-god={g.deck} data-stage={p.stage}>
              <div className="race__tube">
                {marks.map((m, i) => (
                  <span key={i} className="race__mark" style={{ bottom: `${m * 100}%` }} title={stageName(i + 1)} />
                ))}
                <div className="race__fill" style={{ height: `${pct}%` }}>
                  <span className="race__runner">{GOD_GLYPH[g.deck]}</span>
                </div>
              </div>
              <div className="race__pct">{Math.round(pct)}%</div>
              <div className="race__who">{g.character}</div>
            </div>
          );
        })}
      </div>
      <div className="race__goal">⛩ 강림</div>
    </div>
  );
}
