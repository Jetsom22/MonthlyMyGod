// 《월간 MY GOD》 규칙 엔진 — 시스템 기획서 §5(5페이즈)·§6(트랙)·§9(전투)·§10(죽음) + 카드 기획서 §9(effects)
// 순수 로직. applyAction(state, action) → 새 state. UI·AI 모두 이 함수만 거친다.

import { BALANCE, card, GOD_BY_ID, DECKS } from './db';
import type {
  Amount,
  Effect,
  GameAction,
  GameEvent,
  GameState,
  PlayerState,
  PowerStage,
  RaidTarget,
  Seat,
  TargetRef,
  TargetSpec,
  TriggerName,
  Unit,
  Zone,
} from './types';
import { STAGE_NAMES } from './types';

// ───────────── 난수 (시드 고정 — 재현 가능) ─────────────

function rand(s: GameState): number {
  s.rngSeed = (s.rngSeed + 0x6d2b79f5) | 0;
  let t = s.rngSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ───────────── 기본 조회 ─────────────

export const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
export const god = (p: PlayerState) => GOD_BY_ID[p.god];
export const stageName = (stage: number) => STAGE_NAMES[stage] ?? `${stage}단`;
export const threshold = (p: PlayerState) => god(p).track.thresholds[p.stage];
export const vessel = (p: PlayerState) => god(p).track.vessels[p.stage];
export const maxStage = (p: PlayerState) => god(p).track.thresholds.length - 1;
export const isGhost = (u: Unit) => !!card(u.cardId).ghost;
export const allUnits = (p: PlayerState) => [...p.day, ...p.sanct];
export const ghostCount = (p: PlayerState) => allUnits(p).filter(isGhost).length;

export function findUnit(s: GameState, uid: number): Unit | undefined {
  for (const p of s.players) {
    const u = p.day.find((x) => x.uid === uid) ?? p.sanct.find((x) => x.uid === uid);
    if (u) return u;
  }
  return undefined;
}

export function currentPowerStage(p: PlayerState): PowerStage | undefined {
  return god(p).power.stages.find((st) => st.stage === p.stage);
}

/** 강림 레이스 진행도 (0~1) — 지난 문턱 합 + 현재 OP */
export function progress(p: PlayerState): number {
  const th = god(p).track.thresholds;
  const total = th.reduce((a, b) => a + b, 0);
  const done = th.slice(0, p.stage).reduce((a, b) => a + b, 0);
  return Math.min(1, (done + Math.min(p.op, th[p.stage])) / total);
}

// ───────────── 스탯 계산 (기본 + 지속 버프 + 성지 패시브 + 이번 턴) ─────────────

function passiveMatches(who: string | undefined, u: Unit): boolean {
  switch (who) {
    case 'my_units':
      return true;
    case 'my_ghosts':
      return isGhost(u);
    case 'my_day_ghosts':
      return isGhost(u) && u.zone === 'day';
    case 'all_my_day':
      return u.zone === 'day';
    case 'all_my_sanct':
      return u.zone === 'sanct';
    default:
      return false;
  }
}

function passiveBonus(s: GameState, u: Unit, verb: 'offering_buff' | 'raid_buff' | 'life_buff'): number {
  const p = s.players[u.owner];
  let bonus = 0;
  for (const sh of p.shrines) {
    for (const e of card(sh.cardId).effects ?? []) {
      if (e.when === 'passive' && e.what === verb && passiveMatches(e.who, u)) {
        bonus += typeof e.params?.amount === 'number' ? e.params.amount : 0;
      }
    }
  }
  return bonus;
}

export function effOffering(s: GameState, u: Unit): number {
  const c = card(u.cardId);
  return Math.max(0, (c.offering ?? 0) + u.perm.offering + u.temp.offering + passiveBonus(s, u, 'offering_buff'));
}
export function effRaid(s: GameState, u: Unit): number {
  const c = card(u.cardId);
  return Math.max(0, (c.raid ?? 0) + u.perm.raid + u.temp.raid + passiveBonus(s, u, 'raid_buff'));
}
export function effLife(s: GameState, u: Unit): number {
  const c = card(u.cardId);
  return Math.max(1, (c.life ?? 1) + u.perm.life + u.temp.life + passiveBonus(s, u, 'life_buff'));
}
export const remainingLife = (s: GameState, u: Unit) => effLife(s, u) - u.dmg;

export function daySlots(p: PlayerState): number {
  let n = BALANCE.daySlots;
  for (const sh of p.shrines) {
    for (const e of card(sh.cardId).effects ?? []) {
      if (e.when === 'passive' && e.what === 'slot_buff' && e.params?.zone === 'day') n += Number(e.params.amount ?? 0);
    }
  }
  return n;
}
export const sanctSlots = (_p: PlayerState) => BALANCE.sanctSlots;

/** 사망 시 효과 요약 — 표시·AI 평가용 */
export function deathSummary(s: GameState, u: Unit): { ghosts: number; op: number } {
  const p = s.players[u.owner];
  let ghosts = 0;
  let op = 0;
  for (const e of [...(card(u.cardId).effects ?? []), ...u.granted]) {
    if (typeof e.when !== 'object' || e.when.trigger !== 'on_death') continue;
    if (e.from !== undefined && p.stage < e.from) continue;
    if (e.what === 'summon_token') ghosts += e.params?.count ?? 1;
    if (e.what === 'op_gain' && typeof e.params?.amount === 'number') op += e.params.amount;
  }
  return { ghosts, op };
}

// ───────────── 로그 ─────────────

const LOG_CAP = 160;

function log(s: GameState, seat: Seat, kind: GameEvent['kind'], text: string, extra: Partial<GameEvent> = {}) {
  s.log.push({ id: s.nextEventId++, seat, kind, text, ...extra });
  if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP);
}

const who = (s: GameState, seat: Seat) => god(s.players[seat]).character;

// ───────────── 생성 ─────────────

function newUnit(s: GameState, owner: Seat, cardId: string, zone: Zone, enteredTurn: number, moved: boolean): Unit {
  return {
    uid: s.nextUid++,
    cardId,
    owner,
    zone,
    dmg: 0,
    enteredTurn,
    moved,
    raided: false,
    doomed: false,
    temp: { offering: 0, raid: 0, life: 0 },
    perm: { offering: 0, raid: 0, life: 0 },
    granted: [],
  };
}

export interface MatchOptions {
  gods: [string, string];
  ai: [boolean, boolean];
  seed?: number;
  first?: Seat;
}

export function createMatch(opts: MatchOptions): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const mkPlayer = (seat: Seat): PlayerState => {
    const g = GOD_BY_ID[opts.gods[seat]];
    return {
      seat,
      god: g.id,
      isAI: opts.ai[seat],
      deck: [...(DECKS[g.deck]?.cards ?? [])],
      hand: [],
      graveyard: [],
      stage: 0,
      op: 0,
      faith: 0,
      day: [],
      sanct: [],
      shrines: [],
      powerUsedThisTurn: false,
      powerUsedLatent: 0,
      turnsTaken: 0,
    };
  };
  const s: GameState = {
    players: [mkPlayer(0), mkPlayer(1)],
    active: 0,
    first: 0,
    turn: 0,
    phase: 'prep',
    pending: null,
    winner: null,
    nextUid: 1,
    nextEventId: 1,
    log: [],
    rngSeed: seed | 0,
  };
  for (const p of s.players) {
    shuffle(s, p.deck);
    for (let i = 0; i < BALANCE.startHand; i++) p.hand.push(p.deck.pop()!);
  }
  s.first = opts.first ?? (rand(s) < 0.5 ? 0 : 1);
  s.active = s.first;
  log(s, s.first, 'info', `정모 시작 — ${who(s, s.first)} 선공, ${who(s, other(s.first))} 후공 (첫 턴 신앙심 +${BALANCE.secondPlayerFaithBonus})`);
  startTurn(s);
  return s;
}

// ───────────── 드로우 ─────────────

function drawCards(s: GameState, p: PlayerState, n: number, fromTurnDraw = false) {
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (fromTurnDraw) {
        const before = p.op;
        p.op = Math.max(0, p.op - BALANCE.deckOutPenalty);
        log(s, p.seat, 'op', `신앙이 바닥났다 — 덱 소진, OP -${before - p.op}`, { amount: -(before - p.op) });
      }
      return;
    }
    const id = p.deck.pop()!;
    if (p.hand.length >= BALANCE.handLimit) {
      p.graveyard.push(id);
      log(s, p.seat, 'burn', `손패가 넘쳐 《${card(id).name}》 소각`);
    } else {
      p.hand.push(id);
      log(s, p.seat, 'draw', `카드 1장`);
    }
  }
}

// ───────────── 효과 실행 ─────────────

interface Ctx {
  seat: Seat;
  sourceUid?: number;
  chosen?: TargetRef;
  sacOffering?: number;
  byPower?: boolean;
  depth: number;
}

function resolveAmount(s: GameState, a: Amount | undefined, ctx: Ctx): number {
  if (a === undefined) return 0;
  if (typeof a === 'number') return a;
  const p = s.players[ctx.seat];
  switch (a) {
    case 'ghost_count':
      return ghostCount(p);
    case 'sac_offering':
      return ctx.sacOffering ?? 0;
    case 'self_offering': {
      const u = ctx.sourceUid !== undefined ? findUnit(s, ctx.sourceUid) : undefined;
      return u ? effOffering(s, u) : 0;
    }
  }
}

function selectUnits(s: GameState, e: Effect, ctx: Ctx): Unit[] {
  const p = s.players[ctx.seat];
  switch (e.who) {
    case 'source_unit': {
      const u = ctx.sourceUid !== undefined ? findUnit(s, ctx.sourceUid) : undefined;
      return u ? [u] : [];
    }
    case 'chosen': {
      if (ctx.chosen?.kind !== 'unit') return [];
      const u = findUnit(s, ctx.chosen.uid);
      return u ? [u] : [];
    }
    case 'all_my_day':
      return [...p.day];
    case 'all_my_sanct':
      return [...p.sanct];
    case 'my_units':
      return allUnits(p);
    case 'my_ghosts':
      return allUnits(p).filter(isGhost);
    case 'my_day_ghosts':
      return p.day.filter(isGhost);
    case 'enemy_sanct_weakest': {
      const opp = s.players[other(ctx.seat)];
      if (opp.sanct.length === 0) return [];
      const sorted = [...opp.sanct].sort((a, b) => remainingLife(s, a) - remainingLife(s, b) || a.uid - b.uid);
      return [sorted[0]];
    }
    default:
      return [];
  }
}

function runEffects(s: GameState, effects: Effect[], ctx: Ctx) {
  for (const e of effects) {
    if (s.winner !== null && s.phase === 'over') return;
    runEffect(s, e, ctx);
  }
}

function runEffect(s: GameState, e: Effect, ctx: Ctx) {
  if (ctx.depth > 12) return; // 연쇄 폭주 방지
  const p = s.players[ctx.seat];
  if (e.from !== undefined && p.stage < e.from) return;
  if (e.cond?.min_ghosts !== undefined && ghostCount(p) < e.cond.min_ghosts) return;
  const amt = resolveAmount(s, e.params?.amount, ctx);

  switch (e.what) {
    case 'op_gain': {
      if (amt <= 0) return;
      p.op += amt;
      log(s, p.seat, 'op', `OP +${amt}`, { amount: amt });
      return;
    }
    case 'op_lose': {
      const before = p.op;
      p.op = Math.max(0, p.op - amt);
      if (before !== p.op) log(s, p.seat, 'op', `OP -${before - p.op}`, { amount: -(before - p.op) });
      return;
    }
    case 'faith_gain': {
      p.faith += amt;
      log(s, p.seat, 'faith', `신앙심 +${amt}`, { amount: amt });
      return;
    }
    case 'offering_buff':
    case 'raid_buff':
    case 'life_buff': {
      const key = e.what === 'offering_buff' ? 'offering' : e.what === 'raid_buff' ? 'raid' : 'life';
      for (const u of selectUnits(s, e, ctx)) {
        if (e.params?.duration === 'permanent') u.perm[key] += amt;
        else u.temp[key] += amt;
      }
      return;
    }
    case 'heal': {
      for (const u of selectUnits(s, e, ctx)) u.dmg = 0;
      return;
    }
    case 'summon_token': {
      const count = e.params?.count ?? 1;
      const token = e.params?.token ?? 'PAT-T-001';
      let made = 0;
      for (let i = 0; i < count; i++) {
        if (p.day.length >= daySlots(p)) {
          log(s, p.seat, 'burn', `자리가 없어 ${card(token).name}이 흩어졌다`);
          continue;
        }
        p.day.push(newUnit(s, p.seat, token, 'day', -1, false));
        made++;
      }
      if (made > 0) log(s, p.seat, 'summon', `${card(token).name} ${made} 소환`, { amount: made });
      return;
    }
    case 'sacrifice': {
      for (const u of selectUnits(s, e, ctx)) {
        ctx.sacOffering = killUnit(s, u, 'sacrifice', { seat: ctx.seat, byPower: !!ctx.byPower }, ctx.depth + 1);
      }
      return;
    }
    case 'grant_keyword': {
      for (const u of selectUnits(s, e, ctx)) {
        u.granted.push({
          when: { trigger: 'on_death' },
          what: 'summon_token',
          who: 'self_owner',
          params: { token: e.params?.token ?? 'PAT-T-001', count: e.params?.count ?? 1 },
        });
        log(s, p.seat, 'info', `《${card(u.cardId).name}》에 「사망 시: 유령 소환」 각인`, { uid: u.uid });
      }
      return;
    }
    case 'draw':
      drawCards(s, p, e.params?.count ?? 1);
      return;
    case 'discard': {
      const count = Math.min(e.params?.count ?? 1, p.hand.length);
      if (count <= 0) return;
      if (p.isAI) {
        for (let i = 0; i < count; i++) {
          const idx = p.hand.reduce((best, id, j) => (card(id).cost > card(p.hand[best]).cost ? j : best), 0);
          const [id] = p.hand.splice(idx, 1);
          p.graveyard.push(id);
          log(s, p.seat, 'burn', `《${card(id).name}》 버림`);
        }
      } else {
        s.pending = { seat: p.seat, kind: 'discard', count };
      }
      return;
    }
    case 'redeploy': {
      for (const u of selectUnits(s, e, ctx)) u.moved = false;
      return;
    }
    case 'rush_sanctuary': {
      if (ctx.chosen?.kind !== 'hand') return;
      const id = p.hand[ctx.chosen.index];
      if (!id || card(id).type !== 'U' || p.sanct.length >= sanctSlots(p)) return;
      p.hand.splice(ctx.chosen.index, 1);
      const u = newUnit(s, p.seat, id, 'sanct', s.turn, true);
      p.sanct.push(u);
      log(s, p.seat, 'play', `《${card(id).name}》 성역에 즉시 배치`, { uid: u.uid });
      return;
    }
    case 'instant_offering': {
      for (const u of selectUnits(s, e, ctx)) {
        const off = effOffering(s, u);
        if (off > 0) {
          p.op += off;
          log(s, p.seat, 'op', `《${card(u.cardId).name}》 즉시 봉헌 OP +${off}`, { amount: off, uid: u.uid });
        }
      }
      return;
    }
    case 'doom': {
      for (const u of selectUnits(s, e, ctx)) u.doomed = true;
      return;
    }
    case 'damage_unit': {
      if (amt <= 0) return;
      for (const u of selectUnits(s, e, ctx)) damageUnit(s, u, amt, 'effect', ctx.depth + 1);
      return;
    }
    case 'damage_track': {
      const opp = s.players[other(ctx.seat)];
      const before = opp.op;
      opp.op = Math.max(0, opp.op - amt);
      log(s, opp.seat, 'track', `트랙 직격 OP -${before - opp.op}`, { amount: -(before - opp.op) });
      return;
    }
    case 'slot_buff':
      return; // 패시브 — daySlots()가 계산
  }
}

/** 효과 주인(신도) 자신의 트리거 */
function fireSelf(s: GameState, u: Unit, trigger: TriggerName, extra: Partial<Ctx>, depth: number) {
  const effects = [...(card(u.cardId).effects ?? []), ...u.granted].filter(
    (e) => typeof e.when === 'object' && e.when.trigger === trigger,
  );
  if (effects.length) runEffects(s, effects, { seat: u.owner, sourceUid: u.uid, depth, ...extra });
}

/** 한 플레이어 진영 전체의 트리거 — 순서: 신 권능(지속) → 성지(설치순) → 필드 신도(uid순) */
function fireSide(
  s: GameState,
  seat: Seat,
  trigger: TriggerName,
  info: { deadZone?: Zone; deadGhost?: boolean },
  depth: number,
) {
  const p = s.players[seat];
  const matches = (e: Effect) => {
    if (typeof e.when !== 'object' || e.when.trigger !== trigger) return false;
    if (e.cond?.zone !== undefined && e.cond.zone !== info.deadZone) return false;
    if (e.cond?.ghost !== undefined && e.cond.ghost !== info.deadGhost) return false;
    return true;
  };
  const ps = currentPowerStage(p);
  if (ps?.usage === 'passive') {
    const eff = ps.effects.filter(matches);
    if (eff.length) {
      if (trigger === 'turn_start' && eff.some((e) => e.what === 'op_gain')) {
        log(s, seat, 'power', `「${ps.name ?? god(p).power.name}」`);
      }
      runEffects(s, eff, { seat, depth });
    }
  }
  for (const sh of [...p.shrines]) {
    const eff = (card(sh.cardId).effects ?? []).filter(matches);
    if (eff.length) runEffects(s, eff, { seat, depth });
  }
  for (const u of [...allUnits(p)].sort((a, b) => a.uid - b.uid)) {
    const eff = [...(card(u.cardId).effects ?? []), ...u.granted].filter(matches);
    if (eff.length) runEffects(s, eff, { seat, sourceUid: u.uid, depth });
  }
}

function removeUnit(p: PlayerState, u: Unit) {
  p.day = p.day.filter((x) => x.uid !== u.uid);
  p.sanct = p.sanct.filter((x) => x.uid !== u.uid);
}

/** 사망 처리 — 시스템 §9·§10, 카드 기획서 §9-1 순서. 반환: 사망 직전 봉헌력 */
function killUnit(
  s: GameState,
  u: Unit,
  cause: 'combat' | 'execution' | 'sacrifice' | 'effect',
  sac: { seat: Seat; byPower: boolean } | null,
  depth: number,
): number {
  const owner = s.players[u.owner];
  if (!allUnits(owner).some((x) => x.uid === u.uid)) return 0;
  const c = card(u.cardId);
  const off = effOffering(s, u);
  const zoneWas = u.zone;
  removeUnit(owner, u);
  const verb = cause === 'sacrifice' ? '희생' : cause === 'execution' ? '처형' : '쓰러짐';
  log(s, u.owner, 'death', `《${c.name}》 ${verb}`, { uid: u.uid });

  // 1. 처형 손실 (유령은 이미 죽은 자 — 손실 없음)
  if (cause === 'execution' && !c.ghost && off > 0) {
    const before = owner.op;
    owner.op = Math.max(0, owner.op - off);
    if (before !== owner.op) log(s, u.owner, 'op', `무의미한 죽음 — OP -${before - owner.op}`, { amount: -(before - owner.op) });
  }
  // 2. 희생 트리거
  if (cause === 'sacrifice' && sac) {
    if (sac.byPower) fireSelf(s, u, 'on_sacrificed_by_power', { sacOffering: off }, depth);
    fireSide(s, sac.seat, 'my_sacrifice', {}, depth);
    if (sac.byPower) fireSide(s, sac.seat, 'power_sacrifice', {}, depth);
  }
  // 3. 죽은 신도 자신의 「사망 시」 (유령은 트리거를 낳지 않는다)
  if (!c.ghost) fireSelf(s, u, 'on_death', {}, depth);
  // 4. 소유자 진영 반응 (성지·다른 신도)
  fireSide(s, u.owner, 'ally_death', { deadZone: zoneWas, deadGhost: !!c.ghost }, depth);
  if (!c.ghost) owner.graveyard.push(u.cardId);
  return off;
}

function damageUnit(s: GameState, u: Unit, amt: number, cause: 'combat' | 'execution' | 'effect', depth: number) {
  if (amt <= 0) return;
  u.dmg += amt;
  log(s, u.owner, 'damage', `《${card(u.cardId).name}》 ${amt} 피해`, { uid: u.uid, amount: amt });
  if (u.dmg >= effLife(s, u)) killUnit(s, u, cause, null, depth);
}

// ───────────── 턴 흐름 ─────────────

function startTurn(s: GameState) {
  const p = s.players[s.active];
  p.turnsTaken++;
  s.turn++;
  s.phase = 'prep';
  const bonus = p.seat !== s.first && p.turnsTaken === 1 ? BALANCE.secondPlayerFaithBonus : 0;
  p.faith = vessel(p) + bonus;
  p.powerUsedThisTurn = false;
  for (const u of allUnits(p)) {
    u.moved = false;
    u.raided = false;
  }
  log(s, p.seat, 'turn', `${who(s, p.seat)}의 차례 — ${stageName(p.stage)}, 신앙심 ${p.faith}`);
  fireSide(s, p.seat, 'turn_start', {}, 0);
  drawCards(s, p, 1, true);
}

function endTurnInternal(s: GameState) {
  const p = s.players[s.active];
  // 흑염룡 각성 등 — 턴 끝 소멸
  for (const u of allUnits(p).filter((x) => x.doomed)) killUnit(s, u, 'sacrifice', { seat: p.seat, byPower: false }, 0);

  // ⑤ 종료 페이즈: 봉헌 정산 → 강림 판정 1회
  const settled = p.day.reduce((sum, u) => sum + effOffering(s, u), 0);
  if (settled > 0) {
    p.op += settled;
    log(s, p.seat, 'op', `봉헌 정산 OP +${settled}`, { amount: settled });
  }
  const th = threshold(p);
  if (p.op >= th) {
    if (p.stage >= maxStage(p)) {
      s.winner = p.seat;
      s.phase = 'over';
      log(s, p.seat, 'win', `${god(p).name} 강림 — ${who(s, p.seat)} 승리`);
    } else {
      p.stage++;
      p.op = 0;
      log(s, p.seat, 'ascend', `강림 단계 상승 — ${stageName(p.stage)}`);
    }
  }
  for (const pl of s.players) for (const u of allUnits(pl)) u.temp = { offering: 0, raid: 0, life: 0 };
  if (s.phase === 'over') return;

  if (s.turn >= BALANCE.turnLimit) {
    const [a, b] = s.players;
    s.winner = progress(a) >= progress(b) ? 0 : 1;
    s.phase = 'over';
    log(s, s.winner, 'win', `턴 한도 — 진행도 판정으로 ${who(s, s.winner)} 승리`);
    return;
  }
  s.active = other(s.active);
  startTurn(s);
}

// ───────────── 합법성 검사 (UI·AI 공용) ─────────────

export function unitMatches(_s: GameState, seat: Seat, spec: TargetSpec, u: Unit): boolean {
  if (spec.side === 'ally' && u.owner !== seat) return false;
  if (spec.side === 'enemy' && u.owner === seat) return false;
  if (spec.zone && u.zone !== spec.zone) return false;
  if (spec.ghost === true && !isGhost(u)) return false;
  if (spec.ghost === false && isGhost(u)) return false;
  return true;
}

/** 대상 후보 목록. excludeHand: 지금 내는 카드 자신의 손패 인덱스 */
export function legalTargets(s: GameState, seat: Seat, spec: TargetSpec, excludeHand?: number): TargetRef[] {
  const p = s.players[seat];
  if (spec.side === 'hand') {
    if (p.sanct.length >= sanctSlots(p)) return [];
    return p.hand
      .map((id, index) => ({ id, index }))
      .filter(({ id, index }) => index !== excludeHand && (!spec.type || card(id).type === spec.type))
      .map(({ index }) => ({ kind: 'hand' as const, index }));
  }
  const units = [...allUnits(s.players[0]), ...allUnits(s.players[1])];
  return units.filter((u) => unitMatches(s, seat, spec, u)).map((u) => ({ kind: 'unit' as const, uid: u.uid }));
}

export function canPlaceShrine(p: PlayerState, slot: string): boolean {
  return p.shrines.length < BALANCE.shrineMax && !p.shrines.some((sh) => sh.slot === slot);
}

export type Why = string | null; // null = 가능, 문자열 = 불가 사유

export function whyCantPlay(s: GameState, handIndex: number): Why {
  const p = s.players[s.active];
  if (s.phase !== 'prep') return '준비 페이즈에만 낼 수 있다';
  if (s.pending) return '먼저 선택을 마쳐야 한다';
  const id = p.hand[handIndex];
  if (!id) return '카드가 없다';
  const c = card(id);
  if (c.cost > p.faith) return `신앙심 부족 (${c.cost} 필요)`;
  if (c.type === 'U' && p.day.length >= daySlots(p)) return '일상 자리가 없다';
  if (c.type === 'S' && !canPlaceShrine(p, c.shrine_slot ?? 'day')) return '성지 자리가 없다 (동시 2개, 같은 종류 1개)';
  if (c.target && legalTargets(s, p.seat, c.target, handIndex).length === 0) return '고를 대상이 없다';
  return null;
}

export function whyCantMove(s: GameState, uid: number): Why {
  const p = s.players[s.active];
  const u = allUnits(p).find((x) => x.uid === uid);
  if (!u) return '내 신도가 아니다';
  if (s.phase !== 'prep') return '준비 페이즈에만 옮길 수 있다';
  if (u.zone === 'day' && u.enteredTurn === s.turn) return '이번 턴에 낸 신도는 성역에 못 간다';
  if (u.moved) return '이번 턴에 이미 앉았다';
  if (u.zone === 'day') {
    if (p.sanct.length >= sanctSlots(p)) return '성역 자리가 없다';
  } else if (p.day.length >= daySlots(p)) return '일상 자리가 없다';
  return null;
}

export function whyCantPower(s: GameState): Why {
  const p = s.players[s.active];
  const st = currentPowerStage(p);
  if (!st) return '권능 없음';
  if (st.usage === 'passive') return '지속형 — 자동 발동';
  if (s.phase !== 'prep') return '준비 페이즈에만 쓸 수 있다';
  if (s.pending) return '먼저 선택을 마쳐야 한다';
  if (p.powerUsedThisTurn) return '이번 턴에 이미 썼다';
  if (st.usage === 'once_total' && p.powerUsedLatent >= 1) return `${stageName(p.stage)} 동안 1회 — 이미 썼다`;
  if (st.cost > p.faith) return `신앙심 부족 (${st.cost} 필요)`;
  if (st.target && legalTargets(s, p.seat, st.target).length === 0) return '고를 대상이 없다';
  return null;
}

export function raidTargets(s: GameState, uid: number): RaidTarget[] {
  const p = s.players[s.active];
  const u = p.sanct.find((x) => x.uid === uid);
  if (!u || s.phase !== 'action' || u.raided || effRaid(s, u) <= 0) return [];
  const opp = s.players[other(p.seat)];
  if (opp.sanct.length > 0) return opp.sanct.map((x) => ({ kind: 'unit' as const, uid: x.uid })); // 도발
  return [...opp.day.map((x) => ({ kind: 'unit' as const, uid: x.uid })), { kind: 'track' as const }];
}

// ───────────── 액션 적용 ─────────────

export interface ApplyResult {
  state: GameState;
  error?: string;
}

export function applyAction(prev: GameState, action: GameAction): ApplyResult {
  if (prev.phase === 'over') return { state: prev, error: '대전이 끝났다' };
  const s: GameState = structuredClone(prev);
  const p = s.players[s.active];

  if (s.pending && action.type !== 'chooseDiscard') return { state: prev, error: '먼저 버릴 카드를 골라야 한다' };

  switch (action.type) {
    case 'chooseDiscard': {
      if (!s.pending) return { state: prev, error: '선택할 것이 없다' };
      const pl = s.players[s.pending.seat];
      const id = pl.hand[action.handIndex];
      if (!id) return { state: prev, error: '카드가 없다' };
      pl.hand.splice(action.handIndex, 1);
      pl.graveyard.push(id);
      log(s, pl.seat, 'burn', `《${card(id).name}》 버림`);
      s.pending.count--;
      if (s.pending.count <= 0 || pl.hand.length === 0) s.pending = null;
      return { state: s };
    }

    case 'playCard': {
      const why = whyCantPlay(s, action.handIndex);
      if (why) return { state: prev, error: why };
      const id = p.hand[action.handIndex];
      const c = card(id);
      let target = action.target;
      if (c.target) {
        if (!target) return { state: prev, error: '대상을 골라야 한다' };
        const ok = legalTargets(s, p.seat, c.target, action.handIndex).some((t) =>
          t.kind === 'unit' && target!.kind === 'unit' ? t.uid === target!.uid : t.kind === 'hand' && target!.kind === 'hand' && t.index === target!.index,
        );
        if (!ok) return { state: prev, error: '그 대상은 고를 수 없다' };
      }
      p.hand.splice(action.handIndex, 1);
      // 손패 대상 인덱스 보정 (낸 카드가 빠졌으므로)
      if (target?.kind === 'hand' && target.index > action.handIndex) target = { kind: 'hand', index: target.index - 1 };
      p.faith -= c.cost;

      if (c.type === 'U') {
        const u = newUnit(s, p.seat, id, 'day', s.turn, true);
        p.day.push(u);
        log(s, p.seat, 'play', `《${c.name}》 일상에 배치`, { uid: u.uid });
      } else if (c.type === 'S') {
        p.shrines.push({ cardId: id, slot: c.shrine_slot ?? 'day' });
        log(s, p.seat, 'play', `성지 《${c.name}》 설치`);
      } else {
        log(s, p.seat, 'play', `의식 《${c.name}》`);
        p.graveyard.push(id);
        runEffects(s, c.effects ?? [], { seat: p.seat, chosen: target, depth: 0 });
      }
      return { state: s };
    }

    case 'move': {
      const why = whyCantMove(s, action.uid);
      if (why) return { state: prev, error: why };
      const u = allUnits(p).find((x) => x.uid === action.uid)!;
      removeUnit(p, u);
      u.zone = u.zone === 'day' ? 'sanct' : 'day';
      u.moved = true;
      (u.zone === 'day' ? p.day : p.sanct).push(u);
      log(s, p.seat, 'move', `《${card(u.cardId).name}》 → ${u.zone === 'day' ? '일상' : '성역'}`, { uid: u.uid });
      return { state: s };
    }

    case 'power': {
      const why = whyCantPower(s);
      if (why) return { state: prev, error: why };
      const st = currentPowerStage(p)!;
      if (st.target) {
        const t = action.target;
        if (!t || t.kind !== 'unit') return { state: prev, error: '대상을 골라야 한다' };
        if (!legalTargets(s, p.seat, st.target).some((x) => x.kind === 'unit' && x.uid === t.uid))
          return { state: prev, error: '그 대상은 고를 수 없다' };
      }
      p.faith -= st.cost;
      p.powerUsedThisTurn = true;
      if (st.usage === 'once_total') p.powerUsedLatent++;
      log(s, p.seat, 'power', `권능 「${god(p).power.name}」 (${stageName(p.stage)})`);
      runEffects(s, st.effects, { seat: p.seat, chosen: action.target, byPower: true, depth: 0 });
      return { state: s };
    }

    case 'toAction': {
      if (s.phase !== 'prep') return { state: prev, error: '이미 행동 페이즈다' };
      s.phase = 'action';
      log(s, p.seat, 'phase', `행동 페이즈`);
      return { state: s };
    }

    case 'raid': {
      const targets = raidTargets(s, action.uid);
      const ok = targets.some((t) =>
        t.kind === 'track' ? action.target.kind === 'track' : action.target.kind === 'unit' && t.uid === action.target.uid,
      );
      if (!ok) return { state: prev, error: '습격할 수 없다' };
      const atk = p.sanct.find((x) => x.uid === action.uid)!;
      const opp = s.players[other(p.seat)];
      const power = effRaid(s, atk);
      atk.raided = true;
      if (action.target.kind === 'track') {
        const before = opp.op;
        opp.op = Math.max(0, opp.op - power);
        log(s, p.seat, 'raid', `《${card(atk.cardId).name}》 트랙 직격!`, { uid: atk.uid });
        log(s, opp.seat, 'track', `트랙 직격 OP -${before - opp.op}`, { amount: -(before - opp.op) });
        return { state: s };
      }
      const tgt = findUnit(s, action.target.uid)!;
      if (tgt.zone === 'sanct') {
        // 성역 vs 성역 — 맞트레이드 (동시 피해)
        const counter = effRaid(s, tgt);
        log(s, p.seat, 'raid', `《${card(atk.cardId).name}》 ⚔ 《${card(tgt.cardId).name}》`, { uid: atk.uid });
        tgt.dmg += power;
        atk.dmg += counter;
        log(s, tgt.owner, 'damage', `《${card(tgt.cardId).name}》 ${power} 피해`, { uid: tgt.uid, amount: power });
        if (counter > 0) log(s, atk.owner, 'damage', `《${card(atk.cardId).name}》 반격 ${counter} 피해`, { uid: atk.uid, amount: counter });
        if (tgt.dmg >= effLife(s, tgt)) killUnit(s, tgt, 'combat', null, 0);
        if (atk.dmg >= effLife(s, atk)) killUnit(s, atk, 'combat', null, 0);
      } else {
        // 벽이 걷힌 뒤 — 일상 신도 처형 (반격 없음)
        log(s, p.seat, 'raid', `《${card(atk.cardId).name}》 처형 → 《${card(tgt.cardId).name}》`, { uid: atk.uid });
        damageUnit(s, tgt, power, 'execution', 0);
      }
      return { state: s };
    }

    case 'endTurn': {
      endTurnInternal(s);
      return { state: s };
    }
  }
}

/** 편의: 액션 여러 개를 순서대로 */
export function applyAll(s: GameState, actions: GameAction[]): GameState {
  return actions.reduce((acc, a) => applyAction(acc, a).state, s);
}
