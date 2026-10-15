// 규칙 요약 — 시스템 기획서 요약본 + 웹 프로토타입의 해석 메모.
import './RulesModal.css';

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="규칙 요약" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2 className="display">정모 규칙 — 한 장 요약</h2>
          <button type="button" className="btn btn--small btn--ghost" onClick={onClose}>
            닫기 ✕
          </button>
        </header>
        <div className="modal__body">
          <section>
            <h3>이기는 법</h3>
            <p>
              상대 체력이 아니라 <b>내 강림 트랙을 먼저 완주</b>하면 이긴다. 잠복 → 조짐 → 현현 (마녀만 +승천). 각 단계의 문턱만큼 OP를 채우면 다음
              단계로 — OP는 0으로 초기화, 넘친 OP는 버려진다. 판정은 <b>턴 끝에 1번</b>, 한 턴에 한 단계만.
            </p>
          </section>
          <section>
            <h3>두 자원</h3>
            <ul>
              <li>
                <b>신앙심</b> — 카드·권능 값. 매 턴 그릇(3/6/9)만큼 가득 리필, <b>저축 불가</b>. 후공 첫 턴 +1.
              </li>
              <li>
                <b>OP</b> — 트랙 눈금. 단계마다 0부터.
              </li>
            </ul>
          </section>
          <section>
            <h3>두 개의 방</h3>
            <ul>
              <li>
                <b>일상</b>(3칸) — 턴 끝에 봉헌력만큼 OP. 싸우지 못한다. 처형당하면 봉헌력만큼 OP를 잃는다.
              </li>
              <li>
                <b>성역</b>(2칸) — 습격·수비. 봉헌 못 한다. 성역 신도는 상시 <b>도발</b>: 상대는 성역부터 쳐야 한다.
              </li>
              <li>
                한 신도는 <b>한 턴에 한 번만 앉는다</b>(내기·옮기기 공용). <b>이번 턴에 낸 신도는 성역에 못 간다.</b>
              </li>
            </ul>
          </section>
          <section>
            <h3>한 턴</h3>
            <ol>
              <li>시작 — 신앙심 리필, 턴 시작 효과</li>
              <li>드로우 1장 (덱이 비면 OP -1)</li>
              <li>준비 — 카드 내기·신도 옮기기·권능(턴당 1회)</li>
              <li>행동 — 성역 신도로 습격 (즉시 해결)</li>
              <li>종료 — 일상 봉헌 정산 → 강림 판정</li>
            </ol>
          </section>
          <section>
            <h3>습격</h3>
            <p>
              상대 성역에 신도가 있으면 그중 하나와 <b>맞트레이드</b>(서로 습격력만큼 피해, 상처 누적). 성역이 비면 <b>일상 신도 처형</b>(반격 없음) 또는{' '}
              <b>트랙 직격</b>(상대 현재 OP 감소, 단계는 못 내림).
            </p>
          </section>
          <section>
            <h3>죽음의 문법</h3>
            <p>
              기본은 아무것도 안 나온다. <b>인내</b>는 죽으면 유령이 되어 계속 일하고(목숨1·봉헌1·처형돼도 손실 없음), <b>마녀</b>는 죽음이 곧 봉헌 — 권능
              「검은 제물」로 성역 신도를 태워 봉헌력만큼 OP.
            </p>
          </section>
          <section className="modal__note">
            <h3>웹 프로토타입 해석 메모</h3>
            <ul>
              <li>기획서 수치(문턱 2배·그릇·슬롯·손패 8·시작 4장)를 그대로 썼다. 멀리건은 아직 없다.</li>
              <li>소환된 유령은 소환된 턴에도 옮길 수 있다 (카드기획서 §9-2 acted=false).</li>
              <li>《잊혀진 창립 멤버》 각성 = 현현부터 매 턴 시작, 유령이 있으면 OP +1.</li>
              <li>《다인시아의 그림자》 각성 = 현현부터, 내가 희생할 때마다 상대 성역의 가장 약한 신도에 1 피해.</li>
              <li>《마력 방출》의 피해 대상은 상대 성역에서 가장 빈사인 신도로 자동 지정.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
