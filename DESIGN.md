# UI 재디자인 가이드 (Claude Design 등 디자인 작업자용)

이 프로토타입은 **로직과 화면이 완전히 분리**되어 있습니다. 화면을 갈아엎어도 규칙은 깨지지 않습니다.

- `src/engine/` — 규칙. **건드리지 않아도 됩니다.**
- `src/ui/` — 화면. 여기만 고치면 됩니다.

## 1. 먼저 볼 곳: 디자인 토큰

`src/ui/theme/tokens.css` 한 파일에 색·글꼴·간격·모서리·그림자·크기·모션이 모두 변수로 있습니다. 컴포넌트 CSS는 원시값 대신 이 변수만 씁니다.

| 토큰 | 뜻 |
|---|---|
| `--bg`, `--bg-raised`, `--bg-sunken` | 밤의 탁자 (바탕 3단) |
| `--paper`, `--paper-ink` | 카드 지면 |
| `--op`, `--faith`, `--life`, `--offering`, `--raid` | 자원·스탯 색 |
| `--zone-day`, `--zone-sanct` | 일상 / 성역 구역 |
| `--g-{PAT,WCH,ETN,DSR,VOI,NEU}-{main,point,erosion,soft,hair,skin}` | 신별 색 (아트 기획서 §2-1 키 색상표) |
| `--card-w/h`, `--unit-w/h`, `--sidebar-w` | 카드·신도·사이드바 크기 |
| `--font-display`, `--font-body`, `--font-flavor` | 마스트헤드 / 본문 / 플레이버 |

### 신 테마 바인딩
`data-god="PAT"`처럼 덱 코드를 단 요소 아래에서는 `--god-main`, `--god-point`, `--god-erosion`, `--god-soft`가 그 신의 색이 됩니다. 카드·패널·트랙은 전부 이 4개만 씁니다.

### 강림 단계 = 낙차 (아트 §1-2)
`data-stage="0..3"`을 단 요소 아래에서 `--atmo`(신의 색 침식 강도)와 `--atmo-sat`(채도)이 바뀝니다. 보드 반쪽·신 패널이 단계에 따라 신의 색으로 물드는 효과가 여기서 나옵니다.

## 2. 컴포넌트 지도

모든 컴포넌트는 같은 이름의 `.css`를 옆에 두고 있습니다.

| 파일 | 무엇 | 비고 |
|---|---|---|
| `components/CardFace` | 손패·도감의 카드 한 장 | 비용·이름·아트·종류·텍스트·각성·스탯 |
| `components/UnitToken` | 보드 위 신도/유령 | 실효 스탯, ☠ 사망 효과, NEW/각성/소멸 배지, 이동 버튼 |
| `components/CardArt` | 카드 일러스트 영역 | 플레이스홀더 SVG — §3 참고 |
| `components/GodPanel` | 소환자 패널 | 초상·트랙·신앙심 촛불·권능·성지 2칸·카드 수 |
| `components/DescentTrack` | 강림 트랙 | 단계 체인 + OP 눈금 + "봉헌 예정" 빗금 |
| `components/RaceMeter` | 강림 레이스 | 양쪽 전체 진행도 세로 막대 |
| `components/EventLog` | 정모 기록 | 사건 로그 |
| `components/FxLayer` | 이펙트 | 떠오르는 OP·피해 숫자, 피격 흔들림, ☠, 단계 상승 배너 |
| `components/RulesModal` | 규칙 요약 모달 | |
| `screens/TitleScreen` | 잡지 표지 | 소환자 선택 |
| `screens/MatchScreen` | 대전 | 3단 그리드 레이아웃, 페이즈 바, 손패 |
| `screens/GalleryScreen` | 카드 도감 | |

문구는 `src/ui/text.ts`에 모여 있습니다.

## 3. 일러스트 넣기

1. 그림 파일을 `public/art/`에 넣습니다 (예: `public/art/PAT-U-002.png`).
2. `src/ui/art.ts`의 `ART_OVERRIDES`에 한 줄 추가합니다.
   ```ts
   export const ART_OVERRIDES = { 'PAT-U-002': 'art/PAT-U-002.png' };
   ```
3. 그 카드는 손패·보드·도감 어디서나 플레이스홀더 대신 그 그림으로 나옵니다.

카드 ID는 도감 화면 카드 아래에 표시됩니다.

## 4. 지켜야 할 것

- 엔진 상태는 **읽기만** 합니다. 상태를 바꾸는 건 `applyAction(state, action)` 한 곳뿐입니다 (`MatchScreen`의 `act`).
- `data-uid`, `data-track-seat`, `data-panel-seat`, `data-zone`/`data-zone-seat` 속성은 이펙트 레이어가 위치를 찾는 데 씁니다. 마크업을 바꿔도 이 속성은 남겨 주세요.
- 아트 방향: 플랫·라인리스, 제한 팔레트, 굵은 검은 외곽선 금지 (아트 기획서 §1-1).
