// 이펙트 레이어 — 엔진 로그(GameEvent)를 읽어 떠오르는 숫자·흔들림·배너로 번역한다.
// 엔진은 화면을 모르고, 화면은 로그만 구독한다 (아키텍처 A3 원칙의 웹판).
import { useLayoutEffect, useRef, useState } from 'react';
import { god, stageName } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import './FxLayer.css';

interface FxItem {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: 'op' | 'loss' | 'dmg' | 'death' | 'summon' | 'faith';
}
interface BannerItem {
  id: number;
  title: string;
  sub: string;
  deck: string;
  big: boolean;
}

export function useEventFx(s: GameState) {
  const [fx, setFx] = useState<FxItem[]>([]);
  const [banner, setBanner] = useState<BannerItem | null>(null);
  const lastId = useRef(s.log.length ? s.log[s.log.length - 1].id : 0);
  const rects = useRef(new Map<number, DOMRect>());
  const fxSeq = useRef(0);

  useLayoutEffect(() => {
    const fresh = s.log.filter((e) => e.id > lastId.current);
    if (fresh.length) {
      lastId.current = fresh[fresh.length - 1].id;
      const items: FxItem[] = [];
      const stack = new Map<string, number>(); // 같은 자리 겹침 방지
      const place = (key: string, r: DOMRect | undefined | null, text: string, tone: FxItem['tone']) => {
        if (!r) return;
        const n = stack.get(key) ?? 0;
        stack.set(key, n + 1);
        items.push({ id: ++fxSeq.current, x: r.left + r.width / 2, y: r.top + r.height * 0.35 - n * 22, text, tone });
      };
      const q = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();

      for (const e of fresh) {
        switch (e.kind) {
          case 'op':
          case 'track': {
            const a = e.amount ?? 0;
            if (a === 0) break;
            place(`t${e.seat}`, q(`[data-track-seat="${e.seat}"]`), `${a > 0 ? '+' : ''}${a} OP`, a > 0 ? 'op' : 'loss');
            break;
          }
          case 'faith':
            place(`p${e.seat}`, q(`[data-panel-seat="${e.seat}"]`), `🕯+${e.amount}`, 'faith');
            break;
          case 'damage': {
            const el = document.querySelector(`[data-uid="${e.uid}"]`);
            const r = el?.getBoundingClientRect() ?? rects.current.get(e.uid ?? -1);
            place(`u${e.uid}`, r, `-${e.amount}`, 'dmg');
            if (el) {
              el.classList.remove('is-hit');
              void (el as HTMLElement).offsetWidth;
              el.classList.add('is-hit');
            }
            break;
          }
          case 'death': {
            const r = document.querySelector(`[data-uid="${e.uid}"]`)?.getBoundingClientRect() ?? rects.current.get(e.uid ?? -1);
            place(`u${e.uid}`, r, '☠', 'death');
            break;
          }
          case 'summon':
            place(`z${e.seat}`, q(`[data-zone-seat="${e.seat}"][data-zone="day"]`), `👻×${e.amount}`, 'summon');
            break;
          case 'revive':
            place(`z${e.seat}`, q(`[data-zone-seat="${e.seat}"][data-zone="day"]`), '↺ 되살림', 'summon');
            break;
          case 'bond': {
            const r = (e.uid !== undefined ? document.querySelector(`[data-uid="${e.uid}"]`)?.getBoundingClientRect() : null) ?? q(`[data-panel-seat="${e.seat}"]`);
            place(`b${e.seat}`, r, e.text.startsWith('💔') ? '💔' : '💗', 'death');
            break;
          }
          case 'power': {
            const el = document.querySelector(`[data-panel-seat="${e.seat}"]`);
            if (el) {
              el.classList.remove('is-flash');
              void (el as HTMLElement).offsetWidth;
              el.classList.add('is-flash');
            }
            break;
          }
          case 'ascend': {
            const p = s.players[e.seat];
            setBanner({ id: e.id, title: stageName(p.stage), sub: `${god(p).character} — 강림 단계 상승`, deck: god(p).deck, big: true });
            break;
          }
          case 'turn': {
            const p = s.players[e.seat];
            setBanner((b) => (b?.big && b.id > e.id - 40 ? b : { id: e.id, title: `${god(p).character}의 차례`, sub: `${stageName(p.stage)} · 신앙심 ${p.faith}`, deck: god(p).deck, big: false }));
            break;
          }
        }
      }
      if (items.length) {
        setFx((cur) => [...cur, ...items]);
        const ids = new Set(items.map((i) => i.id));
        setTimeout(() => setFx((cur) => cur.filter((i) => !ids.has(i.id))), 1300);
      }
    }
    // 다음 렌더에서 사라진 신도 위치를 쓰려고 지금 좌표를 저장
    const m = new Map<number, DOMRect>();
    document.querySelectorAll<HTMLElement>('[data-uid]').forEach((el) => m.set(Number(el.dataset.uid), el.getBoundingClientRect()));
    rects.current = m;
  }, [s]);

  useLayoutEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner((b) => (b?.id === banner.id ? null : b)), banner.big ? 1700 : 950);
    return () => clearTimeout(t);
  }, [banner]);

  return { fx, banner };
}

export function FxOverlay({ fx }: { fx: FxItem[] }) {
  return (
    <div className="fx" aria-hidden>
      {fx.map((f) => (
        <span key={f.id} className={`fx__item fx__item--${f.tone}`} style={{ left: f.x, top: f.y }}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

export function Banner({ banner }: { banner: { id: number; title: string; sub: string; deck: string; big: boolean } | null }) {
  if (!banner) return null;
  return (
    <div key={banner.id} className={`banner${banner.big ? ' banner--big' : ''}`} data-god={banner.deck} role="status">
      <div className="banner__title display">{banner.title}</div>
      <div className="banner__sub">{banner.sub}</div>
    </div>
  );
}
