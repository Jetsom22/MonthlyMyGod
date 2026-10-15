// 카드 한 장 (손패·도감). 순수 표시 컴포넌트 — 클릭 동작은 부모가 준다.
import { card } from '../../engine/db';
import { stageName } from '../../engine/rules';
import { SLOT_LABEL, TYPE_LABEL } from '../text';
import { CardArt } from './CardArt';
import './CardFace.css';

interface Props {
  cardId: string;
  /** 소유자의 현재 강림 단계 — 각성 텍스트 활성 표시용 */
  stage?: number;
  disabled?: boolean;
  selected?: boolean;
  targetable?: boolean;
  reason?: string | null;
  size?: 'hand' | 'large';
  showFlavor?: boolean;
  onClick?: () => void;
}

export function CardFace({ cardId, stage = 0, disabled, selected, targetable, reason, size = 'hand', showFlavor, onClick }: Props) {
  const c = card(cardId);
  const isUnit = c.type === 'U' || c.type === 'T';
  const awakened = c.awaken ? stage >= c.awaken.from : false;
  const cls = [
    'card-face',
    `card-face--${size}`,
    `card-face--${c.type}`,
    disabled && 'is-disabled',
    selected && 'is-selected',
    targetable && 'is-targetable',
    onClick && 'is-clickable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={cls} data-god={c.deck} onClick={onClick} title={reason ?? undefined} disabled={!onClick}>
      <div className="card-face__head">
        <span className="card-face__cost" aria-label={`비용 ${c.cost}`}>
          {c.cost}
        </span>
        <span className="card-face__name">{c.name}</span>
      </div>
      <div className="card-face__art">
        <CardArt cardId={cardId} />
      </div>
      <div className="card-face__type">
        {TYPE_LABEL[c.type]}
        {c.shrine_slot ? ` · ${SLOT_LABEL[c.shrine_slot]}` : ''}
        {c.role ? ` · ${c.role}` : ''}
        {c.subtag ? ` · ${c.subtag}` : ''}
      </div>
      <div className="card-face__text">
        {c.text && <p>{c.text}</p>}
        {c.awaken && (
          <p className={`card-face__awaken${awakened ? ' is-on' : ''}`}>
            <b>{stageName(c.awaken.from)}부터:</b> {c.awaken.text}
          </p>
        )}
        {showFlavor && c.flavor && <p className="card-face__flavor">{c.flavor}</p>}
      </div>
      {isUnit && (
        <div className="card-face__stats">
          <span className="stat stat--life" title="목숨값">♥{c.life}</span>
          <span className="stat stat--offering" title="봉헌력 (일상에서 매 턴 OP)">✦{c.offering}</span>
          <span className="stat stat--raid" title="습격력 (성역에서)">⚔{c.raid}</span>
        </div>
      )}
      {reason && disabled && <div className="card-face__reason">{reason}</div>}
    </button>
  );
}
