// 보드 위 신도/유령 한 명. 실효 스탯(버프·성지 반영)과 상태 배지를 보여준다.
import { card } from '../../engine/db';
import { deathSummary, effLife, effOffering, effRaid, stageName } from '../../engine/rules';
import type { GameState, Unit } from '../../engine/types';
import { CardArt } from './CardArt';
import './UnitToken.css';

interface Props {
  s: GameState;
  u: Unit;
  targetable?: boolean;
  selected?: boolean;
  ready?: boolean; // 습격 가능 (행동 페이즈)
  dimmed?: boolean;
  moveLabel?: string | null; // 이동 버튼 문구 (없으면 숨김)
  onClick?: () => void;
  onMove?: () => void;
}

export function UnitToken({ s, u, targetable, selected, ready, dimmed, moveLabel, onClick, onMove }: Props) {
  const c = card(u.cardId);
  const owner = s.players[u.owner];
  const life = effLife(s, u);
  const left = life - u.dmg;
  const off = effOffering(s, u);
  const raid = effRaid(s, u);
  const d = deathSummary(s, u);
  const isNew = u.enteredTurn === s.turn;
  const awake = c.awaken && owner.stage >= c.awaken.from;

  const cls = [
    'unit',
    `unit--${u.zone}`,
    c.ghost && 'unit--ghost',
    targetable && 'is-targetable',
    selected && 'is-selected',
    ready && 'is-ready',
    dimmed && 'is-dimmed',
    u.raided && 'is-spent',
    onClick && 'is-clickable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} data-uid={u.uid} data-god={c.deck}>
      <button type="button" className="unit__body" onClick={onClick} disabled={!onClick} title={describe()}>
        <div className="unit__name">{c.name}</div>
        <div className="unit__art">
          <CardArt cardId={u.cardId} compact />
          <div className="unit__badges">
            {isNew && <span className="unit__badge unit__badge--new">NEW</span>}
            {awake && <span className="unit__badge unit__badge--awake">각성</span>}
            {u.doomed && <span className="unit__badge unit__badge--doom">소멸 예정</span>}
          </div>
        </div>
        <div className="unit__death">
          {d.ghosts > 0 && <span title="사망 시 유령 소환">☠→👻{d.ghosts}</span>}
          {d.op > 0 && <span title="사망 시 OP">☠→+{d.op}OP</span>}
        </div>
        <div className="unit__stats">
          <span className={`stat stat--life${u.dmg > 0 ? ' is-hurt' : ''}`} title="남은 목숨 / 목숨값">
            ♥{left}
            {u.dmg > 0 && <small>/{life}</small>}
          </span>
          <span className={`stat stat--offering${off !== (c.offering ?? 0) ? ' is-buffed' : ''}`} title="봉헌력">
            ✦{off}
          </span>
          <span className={`stat stat--raid${raid !== (c.raid ?? 0) ? ' is-buffed' : ''}`} title="습격력">
            ⚔{raid}
          </span>
        </div>
        {u.dmg > 0 && <div className="unit__wound" style={{ height: `${Math.min(100, (u.dmg / life) * 100)}%` }} />}
      </button>
      {moveLabel && onMove && (
        <button type="button" className="unit__move" onClick={onMove}>
          {moveLabel}
        </button>
      )}
    </div>
  );

  function describe() {
    const lines = [`${c.name}`, c.text, c.awaken ? `${stageName(c.awaken.from)}부터: ${c.awaken.text}` : '', u.granted.length ? `각인 ${u.granted.length}개` : ''];
    return lines.filter(Boolean).join('\n');
  }
}
