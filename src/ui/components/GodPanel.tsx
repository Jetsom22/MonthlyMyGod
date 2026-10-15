// 한 소환자의 패널 — 초상·신·강림 트랙·신앙심·권능·성지·카드 수.
import { card } from '../../engine/db';
import { currentPowerStage, dependentUnit, god, mood, RELIC_IDS, stageName, vessel, wardCount } from '../../engine/rules';
import type { GameState, PlayerState, Seat, Shrine } from '../../engine/types';
import { GLYPH, GOD_GLYPH, MOOD_FACE } from '../art';
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

      {g.deck === 'ETN' && <WardRow p={p} />}
      {g.deck === 'DSR' && <BondRow s={s} p={p} />}

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

/** 영원 — 병실 무덤 매수와 삼종 유품 안치 상태 */
function WardRow({ p }: { p: PlayerState }) {
  const n = wardCount(p);
  return (
    <div className="special-row" title="죽거나 소모된 카드가 쌓이는 곳. 5장마다 병실 참조 카드가 강해진다.">
      <div className="special-row__head">
        <span>병실 무덤</span>
        <b>{n}장</b>
        <small>(5장당 +{Math.floor(n / 5)})</small>
      </div>
      <div className="relics">
        {RELIC_IDS.map((id) => {
          const on = p.graveyard.includes(id);
          return (
            <span key={id} className={`relic${on ? ' is-on' : ''}`} title={`${card(id).name} — ${on ? '안치됨' : '아직'}`}>
              {GLYPH[id]}
            </span>
          );
        })}
        <span className="relics__label">{RELIC_IDS.every((id) => p.graveyard.includes(id)) ? '삼종 안치 — 영원의 순간!' : '삼종 유품'}</span>
      </div>
    </div>
  );
}

/** 욕망 — 하니모해의 얼굴 = 의존 대상 상태 표시기 */
function BondRow({ s, p }: { s: GameState; p: PlayerState }) {
  const m = mood(s, p);
  const d = dependentUnit(s, p);
  return (
    <div className={`special-row bond bond--${m}`}>
      <div className="bond__face">
        하니모해 <span>{MOOD_FACE[m]}</span>
      </div>
      <div className="bond__target">
        {d ? (
          <>
            💗 《{card(d.cardId).name}》{d.owner !== p.seat && <em> 상대 신도</em>}
          </>
        ) : m === '오열' ? (
          '💔 의존 대상을 잃었다'
        ) : (
          '의존 대상 없음'
        )}
      </div>
    </div>
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
