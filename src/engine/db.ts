// 카드·신·덱 카탈로그 로더 (아키텍처 설계서의 CardDB 역할)
import neutral from '../data/cards/neutral.json';
import patience from '../data/cards/patience.json';
import witch from '../data/cards/witch.json';
import eternity from '../data/cards/eternity.json';
import desire from '../data/cards/desire.json';
import voidCards from '../data/cards/void.json';
import gods from '../data/gods.json';
import decks from '../data/decks.json';
import type { CardDef, DeckCode, GodDef } from './types';

export const ALL_CARDS: CardDef[] = [
  ...(neutral as CardDef[]),
  ...(patience as CardDef[]),
  ...(witch as CardDef[]),
  ...(eternity as CardDef[]),
  ...(desire as CardDef[]),
  ...(voidCards as CardDef[]),
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));

export const GODS: GodDef[] = gods as GodDef[];
export const GOD_BY_ID: Record<string, GodDef> = Object.fromEntries(GODS.map((g) => [g.id, g]));
export const GOD_BY_DECK: Partial<Record<DeckCode, GodDef>> = Object.fromEntries(
  GODS.map((g) => [g.deck, g]),
);

export const DECKS = decks as Record<string, { name: string; cards: string[] }>;

/** 시스템 기획서 §11 수치 (임시값 포함). 튜닝은 여기서만. */
export const BALANCE = {
  startHand: 4,
  handLimit: 8,
  secondPlayerFaithBonus: 1,
  secondPlayerExtraCards: 1, // 후공 보정 — 시작 손패 +1장 (선공 승률 편차 완화)
  secondPlayerStartOp: 0, // 후공 보정 — 시작 OP
  deckOutPenalty: 1,
  daySlots: 3,
  sanctSlots: 2,
  shrineMax: 2,
  tributePerTurn: 1, // 헌납 — 턴당 횟수
  tributeFaith: 1, // 헌납 — 얻는 신앙심
  turnLimit: 80, // 안전장치 — 양쪽 합산 턴
};

export function card(id: string): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`알 수 없는 카드: ${id}`);
  return c;
}
