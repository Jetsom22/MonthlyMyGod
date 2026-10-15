// 표지 — "월간 잡지" 결의 타이틀. 소환자(신)를 고르고 정모에 나간다.
import { useState } from 'react';
import { GODS } from '../../engine/db';
import { GOD_GLYPH } from '../art';
import { RulesModal } from '../components/RulesModal';
import { issueLabel } from '../text';
import type { MatchConfig } from './MatchScreen';
import './TitleScreen.css';

export function TitleScreen({ onStart, onGallery }: { onStart: (c: MatchConfig) => void; onGallery: () => void }) {
  const playable = GODS.filter((g) => g.playable);
  const [mine, setMine] = useState(playable[0].id);
  const [opp, setOpp] = useState(playable[1]?.id ?? playable[0].id);
  const [rules, setRules] = useState(false);

  const pick = (id: string) => {
    setMine(id);
    if (id === opp) setOpp(playable.find((g) => g.id !== id)?.id ?? id);
  };

  return (
    <div className="cover">
      <header className="cover__mast">
        <div className="cover__issue">
          <span>{issueLabel()}</span>
          <span>서사형 1:1 오컬트 TCG</span>
          <span>정가 신앙심 3</span>
        </div>
        <h1 className="cover__logo display">
          월간 <span>MY GOD</span>
        </h1>
        <p className="cover__tagline">
          특집 · <b>이번 달엔 누구의 신이 먼저 내려오나</b> — 상대를 쓰러뜨리는 게 아니라, 내 신을 먼저 강림시키는 레이스
        </p>
      </header>

      <section className="cover__picks" aria-label="소환자 선택">
        {GODS.map((g) => {
          const locked = !g.playable;
          const on = g.id === mine;
          return (
            <button
              key={g.id}
              type="button"
              className={`pick${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
              data-god={g.deck}
              onClick={() => !locked && pick(g.id)}
              disabled={locked}
            >
              <div className="pick__portrait">
                <span>{GOD_GLYPH[g.deck]}</span>
              </div>
              <div className="pick__char display">{g.character}</div>
              <div className="pick__nick">
                {g.nickname} · 결핍: {g.deficit}
              </div>
              <div className="pick__god">
                {g.name}
                <em> · {g.epithet}</em>
              </div>
              <div className="pick__arch">{g.archetype}</div>
              <p className="pick__blurb">{g.blurb}</p>
              {locked && <div className="pick__lock">다음 호 예고</div>}
              {on && <div className="pick__badge">나</div>}
            </button>
          );
        })}
      </section>

      <section className="cover__controls">
        <label className="cover__opp">
          상대 소환자
          <select value={opp} onChange={(e) => setOpp(e.target.value)}>
            {playable.map((g) => (
              <option key={g.id} value={g.id}>
                {g.character} — {g.name}
                {g.id === mine ? ' (미러전)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="cover__buttons">
          <button type="button" className="btn btn--primary cover__go" onClick={() => onStart({ mode: 'vsAI', myGod: mine, oppGod: opp })}>
            정모 나가기 →
          </button>
          <button type="button" className="btn" onClick={() => onStart({ mode: 'spectate', myGod: mine, oppGod: opp })}>
            AI끼리 관전
          </button>
          <button type="button" className="btn btn--ghost" onClick={onGallery}>
            카드 도감
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setRules(true)}>
            규칙 요약
          </button>
        </div>
      </section>

      <footer className="cover__foot">
        웹 프로토타입 v0.3 · 다섯 신도 모두 플레이 가능 (욕망·무위 카드는 임시 설계) · 아트는 플레이스홀더 · 정모의 공식 명칭은 아직 미정
      </footer>
      {rules && <RulesModal onClose={() => setRules(false)} />}
    </div>
  );
}
