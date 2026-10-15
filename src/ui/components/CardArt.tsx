// 카드 일러스트 영역. ART_OVERRIDES 에 그림이 있으면 그것을, 없으면 플랫·라인리스 플레이스홀더.
import { card } from '../../engine/db';
import { ART_OVERRIDES, GLYPH, hash01 } from '../art';
import './CardArt.css';

export function CardArt({ cardId, compact = false }: { cardId: string; compact?: boolean }) {
  const url = ART_OVERRIDES[cardId];
  if (url) return <img className="card-art card-art--img" src={url} alt="" draggable={false} />;

  const c = card(cardId);
  const glyph = GLYPH[cardId] ?? '✦';
  const isUnit = c.type === 'U' || c.type === 'T';

  return (
    <div className={`card-art card-art--${c.type}${compact ? ' card-art--compact' : ''}`} aria-hidden>
      {isUnit ? <Silhouette id={cardId} ghost={!!c.ghost} /> : c.type === 'S' ? <Shrine /> : <Ritual />}
      <span className="card-art__glyph">{glyph}</span>
    </div>
  );
}

/** 전신 실루엣 — 단색 면 + 볼 블러쉬 + 발밑 그림자 타원 (아트 §1-1 스펙 1·2·4·6) */
function Silhouette({ id, ghost }: { id: string; ghost: boolean }) {
  const w = 34 + hash01(id, 1) * 14; // 몸통 폭
  const h = 34 + hash01(id, 2) * 12; // 몸통 높이
  const lean = (hash01(id, 3) - 0.5) * 6; // 자세 기울기
  const hairLong = hash01(id, 4) > 0.5;
  const bodyTop = 96 - h - 6;
  return (
    <svg viewBox="0 0 100 100" className="card-art__svg" preserveAspectRatio="xMidYMax meet">
      <ellipse cx="50" cy="94" rx={w * 0.62} ry="4" fill="rgba(0,0,0,0.18)" />
      <g transform={`rotate(${lean} 50 90)`} opacity={ghost ? 0.62 : 1}>
        {/* 몸통 */}
        <rect x={50 - w / 2} y={bodyTop} width={w} height={h + 4} rx={w / 2.6} fill={ghost ? '#e9f2f6' : 'var(--god-main)'} />
        {/* 포인트 (넥타이·브로치) */}
        {!ghost && <rect x={48} y={bodyTop + 4} width="4" height={h * 0.45} rx="2" fill="var(--god-point)" />}
        {/* 머리카락 뒤 */}
        {hairLong && !ghost && <rect x={34} y={bodyTop - 30} width="32" height="34" rx="14" fill="var(--god-hair, #555)" />}
        {/* 얼굴 */}
        <circle cx="50" cy={bodyTop - 14} r="15" fill={ghost ? '#f4fafc' : 'var(--god-skin, #eddcd0)'} />
        {/* 앞머리 */}
        {!ghost && <path d={`M35 ${bodyTop - 15} Q50 ${bodyTop - 38} 65 ${bodyTop - 15} Q58 ${bodyTop - 22} 50 ${bodyTop - 21} Q42 ${bodyTop - 22} 35 ${bodyTop - 15}Z`} fill="var(--god-hair, #555)" />}
        {/* 눈·볼 */}
        <circle cx="44.5" cy={bodyTop - 12} r="1.6" fill="#2b2530" opacity={ghost ? 0.5 : 0.85} />
        <circle cx="55.5" cy={bodyTop - 12} r="1.6" fill="#2b2530" opacity={ghost ? 0.5 : 0.85} />
        <ellipse cx="41" cy={bodyTop - 7.5} rx="3.2" ry="1.8" fill="#f08f8f" opacity="0.45" />
        <ellipse cx="59" cy={bodyTop - 7.5} rx="3.2" ry="1.8" fill="#f08f8f" opacity="0.45" />
      </g>
    </svg>
  );
}

function Ritual() {
  return (
    <svg viewBox="0 0 100 100" className="card-art__svg">
      <circle cx="50" cy="52" r="30" fill="var(--god-point)" opacity="0.28" />
      <circle cx="50" cy="52" r="20" fill="var(--god-point)" opacity="0.35" />
    </svg>
  );
}

function Shrine() {
  return (
    <svg viewBox="0 0 100 100" className="card-art__svg" preserveAspectRatio="xMidYMax meet">
      <ellipse cx="50" cy="94" rx="34" ry="4" fill="rgba(0,0,0,0.18)" />
      <path d="M22 92 V46 Q50 14 78 46 V92 H64 V54 Q50 36 36 54 V92Z" fill="var(--god-main)" />
      <rect x="18" y="88" width="64" height="6" rx="3" fill="var(--god-point)" />
    </svg>
  );
}
