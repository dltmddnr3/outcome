# Stage 8 C1 시각 진행·시간 정보 Builder Evidence

관측일: 2026-08-24 KST

Authority: `GATES_STAGE8_C1_VISUAL_PROGRESS_TIMING.md`, `docs/STAGE8_C1_VISUAL_PROGRESS_TIMING_BRIEF.md`, Cherry 승인 범위. 이 문서는 Builder 구현 증거이며 fresh UX & Product QA, Cherry 승인, release 판정이 아니다. `false_completion_count=13`을 유지한다.

## Red-first

- frontend: `gateProgress`, `hierarchyPlacement`, `timingPresentation`이 없어서 4개 assertion이 실패했다.
- Node Package model: `boundAt` 누락, `expectedDurationMinutes` 누락, 잘못된 예상 시간의 fail-closed 누락으로 3개 assertion이 실패했다.
- 구현 후 같은 회귀를 포함한 frontend 35/35, Node 64/64가 통과했다.

## V1–V6 제품·원본 경계

- V1: Hero, NOW, 역할 카드 4개, funnel, 현재 작업 단계 요약, 탐색 상세, 기본 접힌 기술 증거를 DOM 전 상태 검사로 보존했다.
- V2: Scope 상태는 모든 자식 Stage가 `complete`일 때만 완료, 현재 Scope ID일 때만 진행 중, 나머지는 대기/근거 없음이다. 데스크톱은 단일 선·노드 레일, 모바일은 2열이다.
- V3: 현재 Stage Gate가 available이고 total>0일 때만 `closed/total`, `Math.round(closed/total*100)`과 하나의 라임 gradient gauge를 표시한다. 근거 없음/total=0은 퍼센트와 gauge가 없다.
- V4: Phase/Scope/Stage 위치는 각 원본 배열에서 계산한 `i / total`만 사용한다. 프로젝트 aggregate percent는 만들지 않는다.
- V5: public binding projection에 `boundAt`과 `observedAt`을 별도 보존했다. active+fresh+현재 Stage 일치+유효한 `boundAt`만 경과 시간을 만든다.
- V6: Stage의 선택적 `expected_duration_minutes`를 양의 정수로만 허용한다. 시작 근거와 값이 모두 있어야 `계획 기준 예상`을 표시하며, 현재 두 Package처럼 값이 없으면 `남은 시간 예상 근거 없음`이다.

## V7–V8 브라우저 증거

`OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser`:

- 4 viewport × 프로젝트 2개 × 전체 선택 Stage 18개 = 72 렌더 상태.
- desktop 1440×900: 완료 조건 행 top Cherry Note 1044px, OUTCOME 1044px.
- mobile 390×844: Cherry Note 1686px, OUTCOME 1652px.
- phone 375×812: Cherry Note 1705px, OUTCOME 1652px.
- landscape 844×390: Cherry Note 1344px, OUTCOME 1284px.
- 모든 상태: clipping=0, ellipsis=0, intersections=0, viewportEscape=0, documentOverflow=0, unexpectedEnglish=0, translationFallback=0.
- controls>=44px, text>=11px, text contrast>=4.5, focus contrast>=14.83, sequential headings=true.
- Scope journey=true, Gate progress truth=true, timing honesty=true, technical evidence collapsed=true.
- 활성 반복 motion 의미 요소<=2, 현재 관측에서는 active animation=0, reduced-motion 반복 animation=0.

시각 산출물은 커밋 대상이 아닌 `.outcome-runtime/visual-evidence/`에 프로젝트 2개 × viewport 4개 = 8개 PNG로 생성하고 직접 확인했다. 대표 SHA-256:

- `desktop-1440x900-cherry-note.png`: `376b4e6d782b80dbb9ce54f8f2f3904f1da7b7ec6501e1a25945eeb4289db480`
- `mobile-390x844-cherry-note.png`: `93b51b9e632ae446a4828dcfcbb454229dcbb5a47e5e80aaec9305c141cf50d2`
- `phone-375x812-outcome.png`: `8dbb327ac45f0f41b539ebfd68aa4fbd22db33d305dd1f623c24da236367937f`
- `landscape-844x390-outcome.png`: `1b9f6fc5efe512ac873bbe22321032d5336bcdb9dee07eb37d1414a4a6518dac`

## V9 회귀·경계

- `npm test`: frontend 35/35, Node 64/64.
- `npm run test:security`: 16/16.
- `npm run build:isolated`: PASS, JS asset `index-CUaTLI12.js`.
- candidate public boundary: API/HTML/bundle/rendered UI prohibited identifiers=0.
- mutation matrix: 24/24 = 405 `read_only`.
- scope: 17 product/runtime/test files, Desk/Slack/relay/provider dependency=0.
- runbook: PASS.
- `git diff --check`: PASS.
- unlazy gate checker: `ALL MET (9 met, 2 abandoned)`; V10/V11은 명시적 역할 경계로 open.
- kill-ai-slop scanner: source 9 files, 기존 4 hits. 로그인 화면 gradient/shadow, 기존 dashboard surface radius, 계약상 유지하는 Inter/system stack으로 triage했으며 이번 변경의 새 generic card/pill/kicker/shadow는 없다. 대표 gradient는 Gate gauge 한 곳이다.
- public runtime read-only observation before commit: origin PID 55871 (`node server/index.mjs`, port 8791), tunnel PID 88741 (validated `cloudflared tunnel` identity). Builder는 두 process와 hostname을 변경하지 않았다.

## 열린 경계

- V10: exact candidate 공개 활성화와 fresh UX & Product QA — Planner/독립 QA 전용, open.
- V11: Cherry 공개 화면 확인과 C1 결정 — Cherry 전용, open.
- C1/C2/R11, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 모두 open.
