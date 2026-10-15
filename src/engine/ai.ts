// 간이 AI — 합법 액션을 하나씩 시뮬레이션해 평가함수가 가장 오르는 수를 고르는 그리디.
// (sim/mygod_sim.py 의 그리디 AI 와 같은 결. 고도화는 평가함수 가중치부터.)

import { card, GOD_BY_ID } from './db';
import {
  allUnits,
  applyAction,
  currentPowerStage,
  deathSummary,
  dependentUnit,
  effOffering,
  effRaid,
  effectiveCost,
  god,
  legalTargets,
  other,
  raidTargets,
  RELIC_IDS,
  remainingLife,
  sumPassive,
  wardCount,
  whyCantMove,
  whyCantPlay,
  whyCantPower,
} from './rules';
import type { GameAction, GameState, PlayerState, Seat, Unit } from './types';

const W = {
  op: 1.0, // OP 1 (정규화 후)
  stage: 2.5, // 단계 상승 자체 가치 (그릇·권능)
  dayOffering: 1.5,
  tempOffering: 1.0,
  dayRaid: 0.15,
  dayLife: 0.12,
  sanctRaid: 0.45,
  sanctLife: 0.2,
  witchSacPotential: 0.4,
  deathGhost: 0.7,
  deathOp: 0.9,
  ghostManifest: 1.4, // 인내 현현: 유령 1 = 매 턴 OP 1
  hand: 0.45,
  threat: 0.7,
  relic: 2.2, // 영원: 병실에 안치된 유품 하나
  relicsAll: 3.5, // 영원: 삼종 완성
  ward: 0.08, // 영원: 병실 1장
  dependent: 1.2, // 욕망: 의존 대상이 있다
  leech: 1.2, // 욕망: 의존 대상이 봉헌할 때 흡착되는 OP
  shrine: 1.4, // 성지 — 판에 남는 상시 이득
  idleDaySlot: 0.8, // 봉헌 0인 신도가 일상 자리를 막고 있음
};

function unitValue(s: GameState, u: Unit, p: PlayerState): number {
  const c = card(u.cardId);
  const life = Math.max(0, remainingLife(s, u));
  const tempOff = u.temp.offering;
  const off = effOffering(s, u);
  const d = deathSummary(s, u);
  const deathVal = d.ghosts * W.deathGhost + d.op * W.deathOp;
  let v = 0.5; // 존재 자체
  // 《영원의 제단》 아래에선 봉헌이 OP가 되지 않는다
  const offW = sumPassive(s, p.seat, 'block_offering_op') > 0 ? 0 : 1;
  if (u.zone === 'day') {
    v += (off - tempOff) * W.dayOffering * offW + tempOff * W.tempOffering * offW + effRaid(s, u) * W.dayRaid + life * W.dayLife + deathVal * 0.6;
  } else {
    v += effRaid(s, u) * W.sanctRaid + life * W.sanctLife + deathVal * 0.9;
    if (god(p).deck === 'WCH') v += off * W.witchSacPotential;
  }
  const relic = god(p).deck === 'ETN' && !!c.tags?.includes('유품');
  if (u.zone === 'day' && off === 0 && !c.ghost && !relic) v -= W.idleDaySlot;
  if (c.ghost && god(p).deck === 'PAT' && p.stage >= 2) v += W.ghostManifest;
  // 영원: 판 위의 유품은 "안치되는 중" — 병실에 들어갈 때 가치의 절반 (같은 유품이 이미 안치됐으면 0)
  if (relic && !p.graveyard.includes(u.cardId)) v += W.relic * 0.5;
  return v;
}

function sideScore(s: GameState, p: PlayerState): number {
  const g = GOD_BY_ID[p.god];
  const th = g.track.thresholds;
  const total = th.reduce((a, b) => a + b, 0);
  const norm = 48 / total;
  const done = th.slice(0, p.stage).reduce((a, b) => a + b, 0);
  let v = (done + Math.min(p.op, th[p.stage])) * norm * W.op + p.stage * W.stage;
  for (const u of allUnits(p)) v += unitValue(s, u, p);
  v += Math.min(p.hand.length, 7) * W.hand;
  v += p.shrines.length * W.shrine;
  // 《아무것도 안 하기》로 스스로 묶였는데 낼 수 있는 카드가 남았다면 그만큼 손해
  if (p.locked && s.active === p.seat && s.phase === 'prep') {
    v -= p.hand.filter((id) => effectiveCost(s, p.seat, id) <= p.faith).length * 0.9;
  }
  // 영원 — 병실 무덤과 삼종 유품
  if (g.deck === 'ETN') {
    const enshrined = RELIC_IDS.filter((id) => p.graveyard.includes(id)).length;
    v += enshrined * W.relic + (enshrined === RELIC_IDS.length ? W.relicsAll : 0) + wardCount(p) * W.ward;
  }
  // 욕망 — 의존 대상
  const d = dependentUnit(s, p);
  if (d) {
    v += W.dependent;
    if (d.zone === 'day') v += Math.min(3, sumPassive(s, p.seat, 'dependent_leech')) * W.leech;
  }
  return v;
}

/** 내 성역이 비었을 때 상대 성역 습격수가 다음 턴에 찌를 위협 */
function threat(s: GameState, me: PlayerState, opp: PlayerState): number {
  if (me.sanct.length > 0) return 0;
  return opp.sanct.reduce((a, u) => a + effRaid(s, u), 0) * W.threat;
}

export function evaluate(s: GameState, seat: Seat): number {
  if (s.winner === seat) return 10000;
  if (s.winner !== null) return -10000;
  const me = s.players[seat];
  const opp = s.players[other(seat)];
  return sideScore(s, me) - sideScore(s, opp) - threat(s, me, opp) + threat(s, opp, me) * 0.5;
}

function prepCandidates(s: GameState): GameAction[] {
  const p = s.players[s.active];
  const out: GameAction[] = [];
  const seen = new Set<string>();
  p.hand.forEach((id, handIndex) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (whyCantPlay(s, handIndex)) return;
    const c = card(id);
    if (c.target) {
      for (const t of legalTargets(s, p.seat, c.target, handIndex)) out.push({ type: 'playCard', handIndex, target: t });
    } else out.push({ type: 'playCard', handIndex });
  });
  if (!whyCantPower(s)) {
    const st = currentPowerStage(p)!;
    if (st.target) for (const t of legalTargets(s, p.seat, st.target)) out.push({ type: 'power', target: t });
    else out.push({ type: 'power' });
  }
  for (const u of allUnits(p)) if (!whyCantMove(s, u.uid)) out.push({ type: 'move', uid: u.uid });
  return out;
}

function powerFollowUps(s: GameState): GameAction[] {
  if (whyCantPower(s)) return [];
  const st = currentPowerStage(s.players[s.active])!;
  if (!st.target) return [{ type: 'power' }];
  return legalTargets(s, s.active, st.target).map((t) => ({ type: 'power' as const, target: t }));
}

/** AI 한 수. 준비 페이즈엔 카드·이동·권능 → 없으면 행동 페이즈로. 행동 페이즈엔 습격 → 없으면 턴 종료. */
export function aiChooseAction(s: GameState): GameAction {
  const seat = s.active;
  const base = evaluate(s, seat);

  if (s.pending) {
    const p = s.players[s.pending.seat];
    const idx = p.hand.reduce((best, id, j) => (card(id).cost > card(p.hand[best]).cost ? j : best), 0);
    return { type: 'chooseDiscard', handIndex: idx };
  }

  if (s.phase === 'prep') {
    let best: GameAction | null = null;
    let bestScore = base + 0.05;
    for (const a of prepCandidates(s)) {
      const r = applyAction(s, a);
      if (r.error) continue;
      let score = evaluate(r.state, seat);
      // 이동은 한 수 더 내다본다 (성역으로 옮겨 권능 희생 등)
      if (a.type === 'move') {
        for (const f of powerFollowUps(r.state)) {
          const r2 = applyAction(r.state, f);
          if (!r2.error) score = Math.max(score, evaluate(r2.state, seat) - 0.02);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best ?? { type: 'toAction' };
  }

  if (s.phase === 'action') {
    let best: GameAction | null = null;
    let bestScore = base + 0.05;
    for (const u of s.players[seat].sanct) {
      for (const t of raidTargets(s, u.uid)) {
        const a: GameAction = { type: 'raid', uid: u.uid, target: t };
        const r = applyAction(s, a);
        if (r.error) continue;
        const score = evaluate(r.state, seat);
        if (score > bestScore) {
          bestScore = score;
          best = a;
        }
      }
    }
    return best ?? { type: 'endTurn' };
  }

  return { type: 'endTurn' };
}

/** 헤드리스: 한 판 끝까지 (테스트·밸런스 확인용) */
export function playOut(s: GameState, maxSteps = 5000): GameState {
  let cur = s;
  for (let i = 0; i < maxSteps && cur.phase !== 'over'; i++) {
    const r = applyAction(cur, aiChooseAction(cur));
    if (r.error) {
      // 안전장치: 막히면 턴을 넘긴다
      cur = applyAction(cur, { type: 'endTurn' }).state;
    } else cur = r.state;
  }
  return cur;
}
