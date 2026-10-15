// UI 표시용 문구 모음 — 카피 수정은 여기서.
import type { CardType, ShrineSlot } from '../engine/types';

export const TYPE_LABEL: Record<CardType, string> = {
  U: '신도',
  R: '의식',
  S: '성지',
  G: '신',
  T: '토큰',
};

export const SLOT_LABEL: Record<ShrineSlot, string> = {
  day: '일상 성지',
  sanct: '성역 성지',
  special: '특수 성지',
};

export const USAGE_LABEL = {
  once_total: '이 단계 동안 1회',
  per_turn: '매 턴 1회',
  passive: '상시',
} as const;

export const PHASE_HINT = {
  prep: '준비 — 카드를 내고, 신도를 옮기고, 권능을 쓴다',
  action: '행동 — 성역 신도로 습격한다 · 일상 신도는 턴 끝에 봉헌',
  over: '대전 종료',
} as const;

export const DECK_LABEL: Record<string, string> = {
  NEU: '중립',
  PAT: '인내',
  WCH: '마녀',
  ETN: '영원',
  DSR: '욕망',
  VOI: '무위',
  NON: '무명',
};

/** 잡지 호수 표기 — 표지용 */
export function issueLabel(d = new Date()): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월호`;
}
