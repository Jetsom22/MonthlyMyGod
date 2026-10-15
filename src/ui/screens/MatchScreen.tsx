// 대전 화면 — 엔진 상태를 그리고, 사람 입력을 GameAction 으로 바꾸고, AI 차례를 한 수씩 재생한다.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { aiChooseAction } from '../../engine/ai';
import { card } from '../../engine/db';
import {
  applyAction,
  createMatch,
  currentPowerStage,
  daySlots,
  effOffering,
  effRaid,
  god,
  legalTargets,
  raidTargets,
  sanctSlots,
  stageName,
  threshold,
  whyCantMove,
  whyCantPlay,
  whyCantPower,
} from '../../engine/rules';
import type { GameAction, GameState, Seat, TargetRef, Unit, Zone } from '../../engine/types';
import { CardFace } from '../components/CardFace';
import { DescentTrack } from '../components/DescentTrack';
import { EventLog } from '../components/EventLog';
import { Banner, FxOverlay, useEventFx } from '../components/FxLayer';
import { GodPanel } from '../components/GodPanel';
import { RaceMeter } from '../components/RaceMeter';
import { RulesModal } from '../components/RulesModal';
import { UnitToken } from '../components/UnitToken';
import { PHASE_HINT } from '../text';
import './MatchScreen.css';

export interface MatchConfig {
  mode: 'vsAI' | 'spectate';
  myGod: string;
  oppGod: string;
  seed?: number;
}

type Sel = { kind: 'none' } | { kind: 'card'; handIndex: number } | { kind: 'power' } | { kind: 'raid'; uid: number };

const SPEEDS = [
  { label: '느리게', mul: 0.6 },
  { label: '보통', mul: 1 },
  { label: '빠르게', mul: 2.2 },
];

export function MatchScreen({ config, onExit }: { config: MatchConfig; onExit: () => void }) {
  const newMatch = useCallback(
    () =>
      createMatch({
        gods: [config.myGod, config.oppGod],
        ai: [config.mode === 'spectate', true],
        seed: config.seed,
      }),
    [config],
  );
  const [s, setS] = useState<GameState>(newMatch);
  const [sel, setSel] = useState<Sel>({ kind: 'none' });
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const { fx, banner } = useEventFx(s);

  const human: Seat | null = config.mode === 'vsAI' ? 0 : null;
  const bottom: Seat = 0;
  const top: Seat = 1;
  const humanTurn = human !== null && s.active === human && s.phase !== 'over';
  const me = human !== null ? s.players[human] : null;

  const flash = (text: string) => setToast({ id: Date.now(), text });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const act = (a: GameAction) => {
    const r = applyAction(s, a);
    if (r.error) flash(r.error);
    else {
      setS(r.state);
      setSel({ kind: 'none' });
    }
  };

  // ── AI 차례: 한 수씩, 보이는 속도로 ──
  useEffect(() => {
    if (s.phase === 'over' || paused) return;
    const seat = s.pending ? s.pending.seat : s.active;
    if (!s.players[seat].isAI) return;
    const a = aiChooseAction(s);
    const base = a.type === 'endTurn' ? 1000 : a.type === 'toAction' ? 550 : a.type === 'raid' ? 900 : 760;
    const t = setTimeout(() => {
      const r = applyAction(s, a);
      setS(r.error ? applyAction(s, { type: 'endTurn' }).state : r.state);
    }, base / SPEEDS[speed].mul);
    return () => clearTimeout(t);
  }, [s, paused, speed]);

  // Esc = 선택 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSel({ kind: 'none' });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── 현재 선택이 허용하는 대상 ──
  const targets = useMemo(() => {
    const units = new Set<number>();
    const hand = new Set<number>();
    let track = false;
    if (human === null || !humanTurn) return { units, hand, track };
    if (sel.kind === 'card') {
      const c = card(s.players[human].hand[sel.handIndex]);
      if (c.target) for (const t of legalTargets(s, human, c.target, sel.handIndex)) (t.kind === 'unit' ? units.add(t.uid) : hand.add(t.index));
    } else if (sel.kind === 'power') {
      const st = currentPowerStage(s.players[human]);
      if (st?.target) for (const t of legalTargets(s, human, st.target)) if (t.kind === 'unit') units.add(t.uid);
    } else if (sel.kind === 'raid') {
      for (const t of raidTargets(s, sel.uid)) (t.kind === 'unit' ? units.add(t.uid) : (track = true));
    }
    return { units, hand, track };
  }, [s, sel, human, humanTurn]);

  const targeting = sel.kind !== 'none';

  // ── 입력 핸들러 ──
  const onHandClick = (handIndex: number) => {
    if (!humanTurn || human === null) return;
    if (s.pending?.seat === human) return act({ type: 'chooseDiscard', handIndex });
    if (sel.kind === 'card' && targets.hand.has(handIndex)) {
      return act({ type: 'playCard', handIndex: sel.handIndex, target: { kind: 'hand', index: handIndex } });
    }
    if (sel.kind === 'card' && sel.handIndex === handIndex) return setSel({ kind: 'none' });
    const why = whyCantPlay(s, handIndex);
    if (why) return flash(why);
    const c = card(s.players[human].hand[handIndex]);
    if (c.target) setSel({ kind: 'card', handIndex });
    else act({ type: 'playCard', handIndex });
  };

  const onUnitClick = (u: Unit) => {
    if (!humanTurn || human === null) return;
    const t: TargetRef = { kind: 'unit', uid: u.uid };
    if (sel.kind === 'card' && targets.units.has(u.uid)) return act({ type: 'playCard', handIndex: sel.handIndex, target: t });
    if (sel.kind === 'power' && targets.units.has(u.uid)) return act({ type: 'power', target: t });
    if (sel.kind === 'raid') {
      if (targets.units.has(u.uid)) return act({ type: 'raid', uid: sel.uid, target: { kind: 'unit', uid: u.uid } });
      if (sel.uid === u.uid) return setSel({ kind: 'none' });
    }
    if (s.phase === 'action' && u.owner === human && u.zone === 'sanct') {
      if (raidTargets(s, u.uid).length) return setSel({ kind: 'raid', uid: u.uid });
      return flash(u.raided ? '이번 턴에 이미 습격했다' : '습격력이 없다 — 수비만 선다');
    }
    if (targeting) setSel({ kind: 'none' });
  };

  const onPower = () => {
    if (!humanTurn) return;
    if (sel.kind === 'power') return setSel({ kind: 'none' });
    const why = whyCantPower(s);
    if (why) return flash(why);
    const st = currentPowerStage(s.active === human ? s.players[human] : s.players[s.active]);
    if (st?.target) setSel({ kind: 'power' });
    else act({ type: 'power' });
  };

  const pendingOffering = s.players[s.active].day.reduce((a, u) => a + effOffering(s, u), 0);

  // ── 렌더 ──
  const renderZone = (seat: Seat, zone: Zone) => {
    const p = s.players[seat];
    const units = zone === 'day' ? p.day : p.sanct;
    const slots = zone === 'day' ? daySlots(p) : sanctSlots(p);
    const isMine = seat === human;
    return (
      <div className={`zone zone--${zone}`} data-zone={zone} data-zone-seat={seat}>
        <div className="zone__label">
          {zone === 'day' ? '일상 · 봉헌' : '성역 · 습격/수비'}
          <span className="zone__count">
            {units.length}/{slots}
          </span>
        </div>
        <div className="zone__row">
          {units.map((u) => {
            const moveWhy = isMine && humanTurn && s.phase === 'prep' && !targeting ? whyCantMove(s, u.uid) : 'x';
            const canRaid = isMine && humanTurn && s.phase === 'action' && raidTargets(s, u.uid).length > 0;
            return (
              <UnitToken
                key={u.uid}
                s={s}
                u={u}
                targetable={targets.units.has(u.uid)}
                selected={sel.kind === 'raid' && sel.uid === u.uid}
                ready={canRaid && sel.kind === 'none'}
                dimmed={targeting && !targets.units.has(u.uid) && !(sel.kind === 'raid' && sel.uid === u.uid)}
                moveLabel={moveWhy === null ? (u.zone === 'day' ? '↑ 성역으로' : '↓ 일상으로') : null}
                onClick={humanTurn ? () => onUnitClick(u) : undefined}
                onMove={() => act({ type: 'move', uid: u.uid })}
              />
            );
          })}
          {Array.from({ length: Math.max(0, slots - units.length) }, (_, i) => (
            <div key={`e${i}`} className="zone__empty">
              {zone === 'day' ? '·' : '⛩'}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHalf = (seat: Seat, flipped: boolean) => {
    const p = s.players[seat];
    return (
      <section className={`half${flipped ? ' half--top' : ' half--bottom'}${s.active === seat ? ' is-active' : ''}`} data-god={god(p).deck} data-stage={p.stage}>
        {flipped ? (
          <>
            {renderZone(seat, 'day')}
            {renderZone(seat, 'sanct')}
          </>
        ) : (
          <>
            {renderZone(seat, 'sanct')}
            {renderZone(seat, 'day')}
          </>
        )}
        {flipped && targets.track && sel.kind === 'raid' && (
          <button type="button" className="track-strike" onClick={() => act({ type: 'raid', uid: sel.uid, target: { kind: 'track' } })}>
            🎯 트랙 직격 — OP -{effRaid(s, s.players[s.active].sanct.find((u) => u.uid === sel.uid)!)}
          </button>
        )}
      </section>
    );
  };

  const prompt = (() => {
    if (s.phase === 'over') return '대전 종료';
    if (human !== null && s.pending?.seat === human) return `버릴 카드를 ${s.pending.count}장 고른다`;
    if (!humanTurn) return `${god(s.players[s.active]).character} 생각 중…`;
    if (sel.kind === 'card') return `《${card(s.players[human!].hand[sel.handIndex]).name}》 — 대상을 고른다 (Esc 취소)`;
    if (sel.kind === 'power') return `권능 — 대상을 고른다 (Esc 취소)`;
    if (sel.kind === 'raid') return targets.track ? '상대 성역이 비었다 — 일상 신도를 처형하거나 트랙을 직격한다' : '도발 — 상대 성역 신도부터 노려야 한다';
    return PHASE_HINT[s.phase];
  })();

  const ap = s.players[s.active];

  return (
    <div className="match" data-mode={config.mode}>
      <header className="masthead">
        <button type="button" className="masthead__logo display" onClick={onExit} title="표지로">
          월간 <span>MY GOD</span>
        </button>
        <div className="masthead__meta">
          턴 {Math.ceil(s.turn / 2)} · {stageName(ap.stage)}의 {god(ap).character}
        </div>
        <div className="masthead__tools">
          {SPEEDS.map((sp, i) => (
            <button key={sp.label} type="button" className={`btn btn--small${speed === i ? ' btn--primary' : ' btn--ghost'}`} onClick={() => setSpeed(i)}>
              {sp.label}
            </button>
          ))}
          {config.mode === 'spectate' && (
            <button type="button" className="btn btn--small" onClick={() => setPaused((x) => !x)}>
              {paused ? '▶ 재생' : '⏸ 멈춤'}
            </button>
          )}
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setRulesOpen(true)}>
            규칙
          </button>
          <button type="button" className="btn btn--small btn--ghost" onClick={onExit}>
            나가기
          </button>
        </div>
      </header>

      <div className="match__grid">
        <aside className="match__left">
          <GodPanel s={s} seat={top} pending={pendingOffering} label={config.mode === 'vsAI' ? '상대 · AI' : 'AI'} powerWhy={null} powerArmed={false} canAct={false} />
          <GodPanel
            s={s}
            seat={bottom}
            pending={pendingOffering}
            label={config.mode === 'vsAI' ? '나' : 'AI'}
            powerWhy={humanTurn ? whyCantPower(s) : '상대 차례'}
            powerArmed={sel.kind === 'power'}
            canAct={human === bottom}
            onPower={onPower}
          />
        </aside>

        <main className="match__board">
          <div className="opp-hand" aria-label={`상대 손패 ${s.players[top].hand.length}장`}>
            {s.players[top].hand.map((_, i) => (
              <span key={i} className="card-back" data-god={god(s.players[top]).deck} />
            ))}
          </div>

          {renderHalf(top, true)}

          <div className={`phasebar${humanTurn ? ' is-mine' : ''}`} data-god={god(ap).deck}>
            <div className="phasebar__steps">
              <span className={s.phase === 'prep' ? 'is-on' : ''}>준비</span>
              <span className={s.phase === 'action' ? 'is-on' : ''}>행동</span>
              <span>종료·봉헌 {pendingOffering > 0 && <b>+{pendingOffering}</b>}</span>
            </div>
            <div className="phasebar__prompt">{prompt}</div>
            <div className="phasebar__actions">
              {humanTurn && s.phase === 'prep' && (
                <button type="button" className="btn" onClick={() => act({ type: 'toAction' })} disabled={!!s.pending}>
                  행동 페이즈 →
                </button>
              )}
              {humanTurn && (
                <button type="button" className="btn btn--primary" onClick={() => act({ type: 'endTurn' })} disabled={!!s.pending}>
                  턴 종료 {ap.op + pendingOffering >= threshold(ap) ? '⛩' : ''}
                </button>
              )}
            </div>
          </div>

          {renderHalf(bottom, false)}

          {me && (
            <div className={`hand${s.pending?.seat === human ? ' is-discarding' : ''}`}>
              {me.hand.map((id, i) => {
                const why = humanTurn ? whyCantPlay(s, i) : '상대 차례';
                const pickable = s.pending?.seat === human || targets.hand.has(i);
                return (
                  <CardFace
                    key={`${id}-${i}`}
                    cardId={id}
                    stage={me.stage}
                    disabled={!pickable && !!why}
                    reason={why}
                    selected={sel.kind === 'card' && sel.handIndex === i}
                    targetable={pickable}
                    onClick={() => onHandClick(i)}
                  />
                );
              })}
              {me.hand.length === 0 && <div className="hand__empty">손패가 비었다</div>}
            </div>
          )}
          {!me && (
            <div className="spectate-tracks">
              <DescentTrack p={s.players[bottom]} />
              <DescentTrack p={s.players[top]} />
            </div>
          )}
        </main>

        <aside className="match__right">
          <RaceMeter s={s} bottomSeat={bottom} />
          <EventLog s={s} />
        </aside>
      </div>

      <FxOverlay fx={fx} />
      <Banner banner={banner} />
      {toast && (
        <div key={toast.id} className="toast" role="alert">
          {toast.text}
        </div>
      )}
      {s.phase === 'over' && s.winner !== null && (
        <WinOverlay s={s} human={human} onAgain={() => { setS(newMatch()); setSel({ kind: 'none' }); }} onExit={onExit} />
      )}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

function WinOverlay({ s, human, onAgain, onExit }: { s: GameState; human: Seat | null; onAgain: () => void; onExit: () => void }) {
  const w = s.players[s.winner!];
  const g = god(w);
  const iWon = human === null ? null : s.winner === human;
  return (
    <div className="win" data-god={g.deck} data-stage={w.stage}>
      <div className="win__card">
        <div className="win__kicker">{iWon === null ? '관전 결과' : iWon ? '찰나의 접신' : '이번 주는 여기까지'}</div>
        <div className="win__title display">{g.name} 강림</div>
        <div className="win__sub">
          {g.character} 승리 · {Math.ceil(s.turn / 2)}턴
        </div>
        <p className="win__flavor">
          {iWon === false
            ? '다음 주 정모에도 나와 주세요. …다들 나오겠죠?'
            : '신이 아주 잠깐, 소환자를 스쳐 갔다. 한 박자 — 그리고 끊겼다.'}
        </p>
        <div className="win__actions">
          <button type="button" className="btn btn--primary" onClick={onAgain}>
            한 판 더
          </button>
          <button type="button" className="btn" onClick={onExit}>
            표지로
          </button>
        </div>
      </div>
    </div>
  );
}
