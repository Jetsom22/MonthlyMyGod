// 카드 도감 — 데이터(JSON)를 그대로 펼쳐 보는 화면. 기획·밸런스 검토용.
import { useMemo, useState } from 'react';
import { ALL_CARDS, DECKS, GODS } from '../../engine/db';
import { stageName } from '../../engine/rules';
import { GOD_GLYPH } from '../art';
import { CardFace } from '../components/CardFace';
import { DECK_LABEL, USAGE_LABEL } from '../text';
import './GalleryScreen.css';

const TABS = ['ALL', 'PAT', 'WCH', 'ETN', 'DSR', 'VOI', 'NEU'] as const;

export function GalleryScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [preview, setPreview] = useState(0); // 각성 미리보기 단계

  const cards = useMemo(
    () => ALL_CARDS.filter((c) => (tab === 'ALL' || c.deck === tab)).sort((a, b) => a.deck.localeCompare(b.deck) || a.type.localeCompare(b.type) || a.cost - b.cost),
    [tab],
  );
  const counts = (deck: string) => {
    const list = DECKS[deck]?.cards ?? [];
    return (id: string) => list.filter((x) => x === id).length;
  };

  return (
    <div className="gallery">
      <header className="gallery__head">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← 표지
        </button>
        <h1 className="display">카드 도감</h1>
        <div className="gallery__tabs">
          {TABS.map((t) => (
            <button key={t} type="button" className={`btn btn--small${tab === t ? ' btn--primary' : ' btn--ghost'}`} onClick={() => setTab(t)}>
              {t === 'ALL' ? '전체' : DECK_LABEL[t]}
            </button>
          ))}
        </div>
        <label className="gallery__stage">
          각성 미리보기
          <select value={preview} onChange={(e) => setPreview(Number(e.target.value))}>
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                {stageName(i)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="gods">
        {GODS.filter((g) => g.playable && (tab === 'ALL' || g.deck === tab)).map((g) => (
          <article key={g.id} className="god-sheet" data-god={g.deck}>
            <div className="god-sheet__title">
              <span className="god-sheet__glyph">{GOD_GLYPH[g.deck]}</span>
              <div>
                <div className="display">{g.name}</div>
                <small>
                  {g.character} · {g.archetype} · 문턱 {g.track.thresholds.join('/')} · 그릇 {g.track.vessels.join('/')}
                </small>
              </div>
            </div>
            <div className="god-sheet__power">권능 「{g.power.name}」</div>
            <ol className="god-sheet__stages">
              {g.power.stages.map((st) => (
                <li key={st.stage}>
                  <b>{stageName(st.stage)}</b>
                  <span className="chip">{USAGE_LABEL[st.usage]}</span>
                  {st.usage !== 'passive' && <span className="chip">신앙심 {st.cost}</span>}
                  <span>
                    {st.name ? `「${st.name}」 ` : ''}
                    {st.text}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      <section className="gallery__grid">
        {cards.map((c) => {
          const n = c.deck === 'NEU' ? Object.keys(DECKS).reduce((a, d) => a + counts(d)(c.id), 0) : counts(c.deck)(c.id);
          return (
            <div key={c.id} className="gallery__item">
              <CardFace cardId={c.id} size="large" showFlavor stage={preview} />
              <div className="gallery__meta">
                <code>{c.id}</code>
                {c.type !== 'T' && <span>{n > 0 ? `기본 덱 ×${n}` : '기본 덱 미포함'}</span>}
                {c.draft && <span className="gallery__draft">임시 설계</span>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
