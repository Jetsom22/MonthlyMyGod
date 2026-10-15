// 《월간 MY GOD》 엔진 타입 — 카드 기획서(effects 스키마)의 웹판 번역.
// 엔진은 React를 모른다. UI는 state를 읽고 GameAction을 던질 뿐.

export type CardType = 'U' | 'R' | 'S' | 'G' | 'T';
export type DeckCode = 'NEU' | 'PAT' | 'WCH' | 'ETN' | 'DSR' | 'VOI' | 'NON';
export type Zone = 'day' | 'sanct';
export type ShrineSlot = 'day' | 'sanct' | 'special';
export type Seat = 0 | 1;

/** 효과 시점 — 지속 / 발동 / 트리거. 상태 조건(각성)은 effect.from 으로 표현 */
export type When = 'passive' | 'active' | { trigger: TriggerName };

export type TriggerName =
  | 'on_death' // 효과 주인(신도) 자신이 죽을 때
  | 'on_sacrificed_by_power' // 효과 주인이 권능으로 희생될 때
  | 'ally_death' // 내 신도(유령 포함)가 죽을 때 — 성지·다른 신도가 반응
  | 'my_sacrifice' // 내가 무언가를 희생할 때
  | 'power_sacrifice' // 내가 권능으로 희생할 때
  | 'turn_start'; // 내 턴 시작

export type ActionVerb =
  | 'op_gain'
  | 'op_lose'
  | 'faith_gain'
  | 'offering_buff'
  | 'raid_buff'
  | 'life_buff'
  | 'heal'
  | 'summon_token'
  | 'sacrifice'
  | 'grant_keyword'
  | 'draw'
  | 'discard'
  | 'redeploy'
  | 'rush_sanctuary'
  | 'instant_offering'
  | 'doom'
  | 'damage_unit'
  | 'damage_track'
  | 'slot_buff';

export type Selector =
  | 'self_owner' // 효과 주인 플레이어
  | 'source_unit' // 효과를 품은 신도
  | 'chosen' // 플레이어가 고른 대상 (card.target 필터)
  | 'all_my_day'
  | 'all_my_sanct'
  | 'my_units'
  | 'my_ghosts'
  | 'my_day_ghosts'
  | 'enemy_sanct_weakest'; // 자동 대상: 상대 성역에서 가장 빈사인 신도

/** 정적/동적 수치 — 문자열은 동적 키 */
export type Amount = number | 'ghost_count' | 'sac_offering' | 'self_offering';

export interface Effect {
  when: When;
  what: ActionVerb;
  who?: Selector;
  params?: {
    amount?: Amount;
    count?: number;
    token?: string;
    duration?: 'turn' | 'permanent';
    zone?: Zone;
    keyword?: string;
  };
  /** 추가 조건 */
  cond?: {
    zone?: Zone; // ally_death: 죽은 신도가 이 구역이었을 때만
    ghost?: boolean; // ally_death: 유령일 때만(true)/유령 아닐 때만(false)
    min_ghosts?: number;
  };
  /** 각성 — 효과 주인의 강림 단계가 이 단계 이상인 동안만 켜짐 (상태 조건, 소급 자동) */
  from?: number;
}

/** 발동 시 고르는 대상의 필터 */
export interface TargetSpec {
  side: 'ally' | 'enemy' | 'any' | 'hand';
  zone?: Zone;
  ghost?: boolean; // true=유령만, false=유령 제외
  type?: CardType; // hand 대상일 때
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  deck: DeckCode;
  cost: number;
  life?: number;
  offering?: number;
  raid?: number;
  text: string;
  flavor?: string;
  subtag?: string;
  role?: string; // 전형(저가 일꾼·벽·습격수…) — 표시용
  shrine_slot?: ShrineSlot;
  target?: TargetSpec;
  effects?: Effect[];
  awaken?: { from: number; text: string };
  ghost?: boolean;
  illust?: string;
}

export interface PowerStage {
  stage: number;
  name?: string;
  cost: number;
  usage: 'once_total' | 'per_turn' | 'passive';
  text: string;
  target?: TargetSpec;
  effects: Effect[];
}

export interface GodDef {
  id: string;
  deck: DeckCode;
  name: string;
  epithet: string;
  character: string;
  nickname: string;
  deficit: string;
  archetype: string;
  blurb: string;
  track: { thresholds: number[]; vessels: number[] };
  power: { name: string; stages: PowerStage[] };
  playable: boolean;
}

// ───────────── 런타임 상태 ─────────────

export interface Unit {
  uid: number;
  cardId: string;
  owner: Seat;
  zone: Zone;
  dmg: number;
  enteredTurn: number; // 손에서 낸 턴 (그 턴엔 성역 금지)
  moved: boolean; // 이번 턴 "앉기" 사용
  raided: boolean;
  doomed: boolean; // 턴 끝에 희생 (흑염룡 각성)
  temp: { offering: number; raid: number; life: number };
  perm: { offering: number; raid: number; life: number };
  granted: Effect[]; // 부여된 키워드 (인내 권능·사규 개정)
}

export interface Shrine {
  cardId: string;
  slot: ShrineSlot;
}

export interface PlayerState {
  seat: Seat;
  god: string; // GodDef.id
  isAI: boolean;
  deck: string[];
  hand: string[];
  graveyard: string[];
  stage: number;
  op: number;
  faith: number;
  day: Unit[];
  sanct: Unit[];
  shrines: Shrine[];
  powerUsedThisTurn: boolean;
  powerUsedLatent: number;
  turnsTaken: number;
}

export type Phase = 'prep' | 'action' | 'over';

export interface PendingChoice {
  seat: Seat;
  kind: 'discard';
  count: number;
}

export interface GameEvent {
  id: number;
  seat: Seat;
  kind:
    | 'turn'
    | 'phase'
    | 'play'
    | 'move'
    | 'power'
    | 'op'
    | 'faith'
    | 'damage'
    | 'death'
    | 'summon'
    | 'raid'
    | 'track'
    | 'ascend'
    | 'win'
    | 'draw'
    | 'burn'
    | 'info';
  text: string;
  amount?: number;
  uid?: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  active: Seat;
  first: Seat;
  turn: number; // 전체 턴 카운터 (양쪽 합산)
  phase: Phase;
  pending: PendingChoice | null;
  winner: Seat | null;
  nextUid: number;
  nextEventId: number;
  log: GameEvent[];
  rngSeed: number;
}

export type TargetRef = { kind: 'unit'; uid: number } | { kind: 'hand'; index: number };
export type RaidTarget = { kind: 'unit'; uid: number } | { kind: 'track' };

export type GameAction =
  | { type: 'playCard'; handIndex: number; target?: TargetRef }
  | { type: 'move'; uid: number }
  | { type: 'power'; target?: TargetRef }
  | { type: 'toAction' }
  | { type: 'raid'; uid: number; target: RaidTarget }
  | { type: 'endTurn' }
  | { type: 'chooseDiscard'; handIndex: number };

export const STAGE_NAMES = ['잠복', '조짐', '현현', '승천'] as const;
