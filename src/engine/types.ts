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
  | 'turn_start' // 내 턴 시작
  | 'enemy_death' // 상대 신도가 죽을 때 (무위)
  | 'opponent_play' // 상대가 카드를 낼 때 (무위)
  | 'dependent_death'; // 의존 대상이 죽을 때 — 「이별」 (욕망)

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
  | 'slot_buff'
  // 영원 — 병실 무덤
  | 'revive' // 병실에서 신도를 되살림 (params.intact: 온전히 / 아니면 목숨 1로 일그러진 채)
  | 'ward_fill' // 병실에 N장 더 쌓음
  | 'block_offering_op' // (지속) 봉헌 정산이 OP가 되지 않는다 — 영원의 제단
  | 'free_card' // (지속) 특정 카드를 신앙심 없이 — 영원의 제단
  // 욕망 — 의존 대상
  | 'designate' // 의존 대상 지정
  | 'copy_stats' // 고른 신도가 의존 대상의 봉헌력·습격력을 똑같이 가짐
  | 'steal' // 상대 신도를 빼앗아 의존 대상으로
  | 'dependent_leech' // (지속) 의존 대상이 봉헌하면 나도 OP
  // 무위
  | 'strike_reduce' // (지속) 습격으로 내 OP가 깎일 때 -N
  | 'offering_tax' // (지속) 상대가 봉헌으로 얻는 OP -N
  | 'lock_plays'; // 이번 턴 더는 카드를 낼 수 없다

export type Selector =
  | 'self_owner' // 효과 주인 플레이어
  | 'source_unit' // 효과를 품은 신도
  | 'chosen' // 플레이어가 고른 대상 (card.target 필터)
  | 'all_my_day'
  | 'all_my_sanct'
  | 'my_units'
  | 'my_ghosts'
  | 'my_day_ghosts'
  | 'enemy_sanct_weakest' // 자동 대상: 상대 성역에서 가장 빈사인 신도
  | 'enemy_units'
  | 'enemy_day'
  | 'enemy_sanct'
  | 'opponent' // 상대 플레이어 (OP·드로우 등)
  | 'dependent' // 의존 대상 (내 편이든 상대든)
  | 'ward_best'; // 자동 대상: 병실에서 가장 비싼 신도

/** 정적/동적 수치 — 문자열은 동적 키 */
export type Amount =
  | number
  | 'ghost_count'
  | 'sac_offering'
  | 'self_offering'
  | 'ward_count' // 병실 무덤 매수
  | 'ward_per5' // 병실 5장당 1
  | 'threshold' // 현재 강림 문턱
  | 'dependent_offering' // 의존 대상의 봉헌력
  | 'dependent_raid';

/** 이하니의 얼굴 — 의존 대상 상태 표시기 (컨셉 §5-④, 컨텐츠 §13) */
export type Mood = 'none' | '방긋' | '울먹' | '오열';

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
    intact?: boolean;
    card?: string;
  };
  /** 추가 조건 */
  cond?: {
    zone?: Zone; // ally_death: 죽은 신도가 이 구역이었을 때만
    ghost?: boolean; // ally_death: 유령일 때만(true)/유령 아닐 때만(false)
    min_ghosts?: number;
    mood?: Mood; // 효과 주인의 얼굴이 이 상태일 때만
    is_dependent?: boolean; // 효과를 품은 신도가 의존 대상일 때만
    dependent_mine?: boolean; // 의존 대상이 내 신도일 때만
    dependent_enemy?: boolean; // 의존 대상이 상대 신도일 때만
    relics?: boolean; // 삼종 유품이 병실에 모두 안치돼 있을 때만
    self_zone?: Zone; // 효과를 품은 신도가 이 구역에 있을 때만
    once_per_turn?: boolean;
  };
  /** 각성 — 효과 주인의 강림 단계가 이 단계 이상인 동안만 켜짐 (상태 조건, 소급 자동) */
  from?: number;
}

/** 발동 시 고르는 대상의 필터 */
export interface TargetSpec {
  side: 'ally' | 'enemy' | 'any' | 'hand' | 'ward'; // ward = 내 병실 무덤
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
  tags?: string[]; // 예: '유품'
  draft?: boolean; // 기획서에 정확값이 없어 웹판에서 임시로 채운 카드
  /** 낼 수 있는 조건 */
  playCond?: { relics?: boolean; dependent?: boolean; dependent_mine?: boolean; day_slot?: boolean };
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
  twisted?: boolean; // 일그러진 채 되살아남 (영원)
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
  /** 병실 무덤의 덤 — 카드 없이 쌓인 매수 (영원 「병실 N장 채움」). 병실 = graveyard + wardBonus */
  wardBonus: number;
  /** 의존 대상 uid (욕망) — 내 편이든 상대든 */
  dependent: number | null;
  /** 의존 대상을 잃고 아직 새로 지정하지 않음 → 오열 */
  heartbroken: boolean;
  /** 이번 턴 더는 카드를 낼 수 없다 (무위 《아무것도 안 하기》) */
  locked: boolean;
  /** 턴당 1회 효과가 이번 턴에 이미 터졌는지 */
  onceFlags: string[];
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
    | 'revive'
    | 'bond'
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

export type TargetRef = { kind: 'unit'; uid: number } | { kind: 'hand'; index: number } | { kind: 'ward'; index: number };
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
