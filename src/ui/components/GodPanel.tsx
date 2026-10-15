// 한 소환자의 패널 — 초상·신·강림 트랙·신앙심·권능·성지·카드 수.
import { card } from '../../engine/db';
import { currentPowerStage, god, stageName, vessel } from '../../engine/rules';
import type { GameState, Seat, Shrine } from '../../engine/types';
import { GOD_GLYPH } from '../art';
import { SLOT_LABEL, USAGE_LABEL } from '../text';
import { DescentTrack } from './DescentTrack';
import './GodPanel.css';

interface Props {
  s: GameState;
  seat: Seat;
  pending: number;
  label: string; // "나" / "상대" / "AI"
  powerWhy: string | null; // null = 사용 가능
  powerArmed: boolean;
  canAct: boolean; // 이 패널 주인이 사람이고 지금 차례인가
  onPower?: () => void;
}

export function GodPanel({ s, seat, pending, label, powerWhy, powerArmed, canAct, onPower }: Props) {
  const p = s.players[seat];
  const g = god(p);
  const st = currentPowerStage(p);
  const next = g.power.stages.find((x) => x.stage === p.stage + 1);
  const active = s.active === seat && s.phase !== 'over';
  const pips = Math.max(vessel(p), p.faith);

  return (
    <section className={`godpanel${active ? ' is-active' : ''}`} data-god={g.deck} data-stage={p.stage} data-panel-seat={seat}>
      <header className="godpanel__head">
        <div className="godpanel__portrait" aria-hidden>
          <span>{GOD_GLYPH[g.deck]}</span>
        </div>
        <div className="godpanel__who">
          <div className="godpanel__label">
            {label} {active && <span className="godpanel__turn">차례</span>}
          </div>
          <div className="godpanel__char">
            {g.character} <small>({g.nickname})</small>
          </div>
          <div className="godpanel__god">
            {g.name} <em>· {g.epithet}</em>
          </div>
        </div>
      </header>

      <DescentTrack p={p} pending={active ? pending : 0} />

      <div className="godpanel__faith" aria-label={`신앙심 ${p.faith} / ${vessel(p)}`}>
        <span className="godpanel__faith-label">신앙심</span>
        <span className="godpanel__pips">
          {Array.from({ length: pips }, (_, i) => (
            <span key={i} className={`pip${i < p.faith ? ' is-on' : ''}${i >= vessel(p) ? ' is-bonus' : ''}`} />
          ))}
        </span>
        <span className="godpanel__faith-num">
          {p.faith}/{vessel(p)}
        </span>
      </div>

      <div className={`power${powerArmed ? ' is-armed' : ''}`}>
        <div className="power__head">
          <span className="power__name">「{st?.name ?? g.power.name}」</span>
          {st && <span className="chip">{USAGE_LABEL[st.usage]}</span>}
          {st && st.usage !== 'passive' && <span className="chip">신앙심 {st.cost}</span>}
        </div>
        <p className="power__text">{st?.text}</p>
        {next && (
          <p className="power__next">
            {stageName(next.stage)} → {next.text}
          </p>
        )}
        {st && st.usage !== 'passive' && canAct && (
          <button type="button" className="btn btn--small power__btn" disabled={!!powerWhy && !powerArmed} onClick={onPower} title={powerWhy ?? undefined}>
            {powerArmed ? '취소' : powerWhy ? powerWhy : '권능 발동'}
          </button>
        )}
      </div>

      <div className="godpanel__shrines">
        {[0, 1].map((i) => (
          <ShrineSlot key={i} shrine={p.shrines[i]} />
        ))}
      </div>

      <footer className="godpanel__counts">
        <span title="손패">🂠 {p.hand.length}</span>
        <span title="덱">🗃 {p.deck.length}</span>
        <span title="버린 카드·묘지">⚰ {p.graveyard.length}</span>
      </footer>
    </section>
  );
}

function ShrineSlot({ shrine }: { shrine?: Shrine }) {
  if (!shrine) return <div className="shrine-slot is-empty">성지 자리</div>;
  const c = card(shrine.cardId);
  return (
    <div className="shrine-slot" data-god={c.deck} title={c.text}>
      <span className="shrine-slot__kind">{SLOT_LABEL[shrine.slot]}</span>
      <span className="shrine-slot__name">{c.name}</span>
      <span className="shrine-slot__text">{c.text}</span>
    </div>
  );
}
