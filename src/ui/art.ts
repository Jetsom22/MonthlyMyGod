// 카드 아트 레지스트리.
// ▸ 실제 일러스트가 생기면 ART_OVERRIDES 에 { 카드ID: '경로' } 한 줄 추가 → 플레이스홀더 대신 그 그림이 나온다.
//   (예: 'PAT-U-002': 'art/PAT-U-002.png'  ← public/art/ 아래 파일)
// ▸ 그 전까지는 아트 기획서 §1-1(플랫·라인리스) 결의 SVG 실루엣 + 글리프로 대신한다.

export const ART_OVERRIDES: Record<string, string> = {
  // 'PAT-U-002': 'art/PAT-U-002.png',
};

/** 카드별 상징 글리프 (플레이스홀더용) */
export const GLYPH: Record<string, string> = {
  // 중립 — 병맛 제물
  'NEU-R-001': '🍙',
  'NEU-R-002': '💬',
  'NEU-R-003': '💳',
  'NEU-R-004': '🍜',
  'NEU-R-005': '🖼️',
  'NEU-R-006': '📢',
  'NEU-R-007': '🕯️',
  'NEU-R-008': '🪙',
  'NEU-R-009': '🔁',
  'NEU-R-010': '💸',
  // 인내
  'PAT-T-001': '👻',
  'PAT-U-001': '🔰',
  'PAT-U-002': '📎',
  'PAT-U-003': '📋',
  'PAT-U-004': '🔧',
  'PAT-U-005': '📁',
  'PAT-U-006': '🔦',
  'PAT-U-007': '📈',
  'PAT-U-008': '🏢',
  'PAT-U-009': '⏳',
  'PAT-U-010': '📷',
  'PAT-U-011': '🗂️',
  'PAT-U-012': '🔒',
  'PAT-R-001': '🎖️',
  'PAT-R-002': '💰',
  'PAT-R-003': '📟',
  'PAT-R-004': '📜',
  'PAT-R-005': '🍻',
  'PAT-R-006': '✂️',
  'PAT-R-007': '💐',
  'PAT-R-008': '🌙',
  'PAT-S-001': '💡',
  'PAT-S-002': '🪦',
  'PAT-S-003': '✊',
  'PAT-S-005': '🏗️',
  // 마녀
  'WCH-U-001': '🧹',
  'WCH-U-002': '🕊️',
  'WCH-U-003': '🩹',
  'WCH-U-004': '🐉',
  'WCH-U-005': '🙏',
  'WCH-U-006': '🪆',
  'WCH-U-007': '💥',
  'WCH-U-008': '🐈‍⬛',
  'WCH-U-009': '🔥',
  'WCH-U-010': '🌑',
  'WCH-U-011': '🗡️',
  'WCH-U-012': '🎭',
  'WCH-R-001': '🔯',
  'WCH-R-002': '🩸',
  'WCH-R-003': '⭕',
  'WCH-R-004': '✨',
  'WCH-R-005': '🐲',
  'WCH-S-001': '⛤',
  'WCH-S-002': '⚱️',
  'WCH-S-003': '🗼',
};

/** 신 초상 글리프 */
export const GOD_GLYPH: Record<string, string> = {
  PAT: '👔',
  WCH: '🔮',
  ETN: '🧸',
  DSR: '💗',
  VOI: '🛋️',
};

/** id → 0..1 해시 (실루엣 변주용) */
export function hash01(id: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
