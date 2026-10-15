// 사건 기록 — 최신이 위. 소환자별 색 띠.
import { god } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import './EventLog.css';

const ICON: Record<string, string> = {
  turn: '🕰',
  phase: '›',
  play: '🃏',
  move: '↕',
  power: '✴',
  op: '✦',
  faith: '🕯',
  damage: '💢',
  death: '☠',
  summon: '👻',
  raid: '⚔',
  track: '🎯',
  ascend: '⛩',
  win: '👑',
  draw: '＋',
  burn: '🔥',
  revive: '↺',
  bond: '💗',
  info: '·',
};

export function EventLog({ s, limit = 40 }: { s: GameState; limit?: number }) {
  const items = s.log.filter((e) => e.kind !== 'draw').slice(-limit).reverse();
  return (
    <div className="elog">
      <div className="elog__title">정모 기록</div>
      <ol className="elog__list">
        {items.map((e) => (
          <li key={e.id} className={`elog__item elog__item--${e.kind}`} data-god={god(s.players[e.seat]).deck}>
            <span className="elog__icon">{ICON[e.kind]}</span>
            <span className="elog__text">{e.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
