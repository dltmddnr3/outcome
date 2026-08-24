# OUTCOME Stage 8 C1 시각 진행·시간 정보 Brief

관측일: 2026-08-24 KST

## 사용자 목표

현재 화면에 들어간 요소와 의미는 모두 보존한다. 첨부된 이전 Scope 레일의 강한 위치 표현을 복원하고, 현재 Stage의 완료 조건 진척과 근거가 있는 시간 정보를 추가해 첫눈에 `어디까지 왔고, 지금 무엇을 넘는 중인지` 이해하게 한다.

## 시각 구조

- 프로젝트 Hero는 현재 프로젝트 이름과 Outcome을 최우선으로 유지한다.
- Hero 또는 그 직후에 `현재 작업 단계 완료 조건`을 한 개의 대표 지표로 둔다.
  - 숫자: Gate `closed / total`과 정수 퍼센트.
  - 그래픽: 어두운 track 위 한 방향 라임 그라데이션 fill.
  - 필수 보정 문구: `프로젝트 전체 진행률이 아닙니다.`
  - Gate 근거가 없거나 total이 0이면 숫자와 fill을 만들지 않고 `완료 조건 근거 없음`을 표시한다.
- Phase는 `현재 큰 단계 i / total`, Scope는 `현재 범위 i / total`, Stage는 `현재 작업 단계 i / total`로 위치만 보여준다. 서로 다른 항목을 합쳐 전체 퍼센트를 만들지 않는다.
- 현재 Phase의 Scope 목록은 데스크톱에서 첨부 이미지처럼 한 줄 레일로 표현한다.
  - 완료: 라임 check node와 완료된 연결선.
  - 현재: 라임 outline node, 한 단계 올라온 어두운 카드, 제한된 semantic glow.
  - 대기: 중립 outline node와 hairline.
  - 상태는 아이콘·형태·한글 text를 같이 써서 색만으로 전달하지 않는다.
  - 모바일은 의미 순서를 유지한 2열 또는 수직 rail로 재배치하며 가로 스크롤을 만들지 않는다.
- NOW와 네 역할 카드는 현재 좋은 구조를 유지한다. active+fresh인 역할만 live motion을 가진다.

## 시간 계약

### 현재 작업시간

`전체 프로젝트 작업시간`을 가장하지 않는다. 아래 조건을 모두 만족할 때만 `현재 역할 연결 후 경과`를 표시한다.

1. binding `status=active`.
2. binding `freshness=fresh`.
3. binding `stage_id`가 프로젝트의 현재 Stage ID와 일치.
4. 원본 registry에 유효한 `bound_at`이 명시됨.

표시는 minute/hour 단위의 읽기 쉬운 한글이며, source label과 기준 시각을 함께 제공한다. 조건 하나라도 빠지면 `작업시간 측정 근거 없음`으로 표시한다. `observed_at`은 freshness 판단 근거이지 시작 시각 대체값이 아니다.

### 남은 작업 예상시간

Gate 비율, activity 글자 수, commit 수, history 수, 세션 활성 시간으로 ETA를 추정하지 않는다. 현재 Stage에 명시적 계획 예상치(선택 필드 `expected_duration_minutes`)가 있고 위의 신뢰 가능한 시작 근거가 있을 때만 `계획 기준 예상`을 표시한다. 값이 없으면 `남은 시간 예상 근거 없음`이 정답이다. 이번 후보에서는 원본 문서에 없는 예상 시간을 새로 채워 넣지 않는다.

## de-slop 결정

- 라임은 브랜드 장식이 아니라 현재·완료·Gate fill의 의미 신호로만 사용한다.
- 그라데이션은 대표 Gate fill 한 곳에 집중하고 배경 분위기용 gradient를 추가하지 않는다.
- nested card, pill/badge, kicker, glow, shadow를 늘리지 않는다.
- 현재 Hero의 의미 있는 Gate fill은 유지 가능하지만, Scope rail과 대표 Gate gauge가 같은 정보를 중복 과장하지 않게 역할을 나눈다.
- Lucide icon family와 기존 charcoal/lime palette를 유지한다. 새 dependency나 임의 brand color를 추가하지 않는다.

## 검증 기준

- red-first unit: exact Gate percent, unavailable Gate, elapsed eligibility, stale/mismatched binding, explicit-estimate-only ETA, no aggregate progress.
- browser: 2 projects × 18 stages × desktop/mobile 전수, 375px, landscape 보강.
- desktop에서 Scope가 하나의 연속 journey로 읽히며 현재 item이 가장 먼저 보인다.
- mobile에서 horizontal overflow, overlap, clipping, ellipsis가 0이다.
- touch target 44px 이상, body contrast 4.5:1 이상, focus visible, sequential headings, unexpected English/fallback 0.
- 반복 motion은 활성 역할과 현재 Scope의 최대 두 의미 요소만 허용하고 `prefers-reduced-motion`에서 반복이 없다.
- 기술 증거는 계속 기본 접힘이며 진행 흐름보다 시각적으로 앞서지 않는다.

## 변경 금지

- Cherry Note iOS, WhiteCastle Desk, auth/provider/Slack/relay 결합.
- `docs/ROADMAP 2.md` 열기·수정·stage·commit.
- 공개 tunnel PID/hostname 재시작 또는 변경.
- C1·C2, R11, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE` 닫기.
