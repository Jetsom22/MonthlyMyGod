// 강림 트랙 — 단계 체인 + 현재 단계 OP 눈금. 종료 페이즈에 들어올 봉헌을 빗금으로 미리 보여준다.
import { god, stageName } from '../../engine/rules';
import type { PlayerState } from '../../engine/types';
import './DescentTrack.css';

export function DescentTrack({ p, pending = 0 }: { p: PlayerState; pending?: number }) {
  const th = god(p).track.thresholds;
  const cur = th[p.stage];
  const filled = Math.min(p.op, cur);
  const incoming = Math.max(0, Math.min(pending, cur - filled));
  const willAscend = p.op + pending >= cur;

  return (
    <div className="track" data-track-seat={p.seat}>
      <ol className="track__stages">
        {th.map((t, i) => (
          <li key={i} className={`track__stage${i < p.stage ? ' is-done' : ''}${i === p.stage ? ' is-current' : ''}`}>
            <span className="track__stage-name">{stageName(i)}</span>
            <span className="track__stage-th">{t}</span>
          </li>
        ))}
      </ol>
      <div className="track__bar" style={{ gridTemplateColumns: `repeat(${cur}, 1fr)` }} aria-label={`OP ${p.op} / ${cur}`}>
        {Array.from({ length: cur }, (_, i) => (
          <span key={i} className={`track__tick${i < filled ? ' is-on' : i < filled + incoming ? ' is-incoming' : ''}`} />
        ))}
      </div>
      <div className="track__read">
        <span className="track__op">
          OP <b>{p.op}</b> / {cur}
        </span>
        {pending > 0 && <span className="track__pending">+{pending} 봉헌 예정</span>}
        {willAscend && <span className="track__ascend">{p.stage === th.length - 1 ? '강림 임박!' : '단계 상승!'}</span>}
      </div>
    </div>
  );
}
