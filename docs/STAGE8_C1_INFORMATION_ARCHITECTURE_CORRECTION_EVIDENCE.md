# Stage 8 C1 정보 구조 fresh QA 교정 Builder 증거

- 관측일: 2026-08-24 KST
- 기준 parent: `36b07cc2141bb00074c75664cfe615ae49911daa`
- prior public tree/asset: `a8692b2440fa7751b664166d2780c7340e54a430` / `index-B2epVH5T.js`
- correction isolated asset: `index-CILj_dlQ.js`
- 권한 경계: Builder는 candidate만 생성했고 공개 origin·Quick Tunnel·hostname을 변경하지 않았다.
- `false_completion_count=13` 보존

## Red-first

요청된 다섯 regression을 제품 수정 전에 추가했다. targeted frontend는 다음 5개가 실패했다.

- `selectedGateCount` 부재
- `detailContentPolicy` 부재
- `gateGroupPresentation` 부재
- listbox Scope group ownership 부재
- `bindingObservationLabel` 부재

교정 뒤 동일 targeted suite 5/5와 browser harness fail-closed 항목이 통과했다.

## 최소 교정

- 선택 Stage `완료 조건 확인`의 `dt`는 label만, `dd`는 Package Gate의 exact `closed/total`만 표시한다. unavailable은 `완료 조건 근거 없음`이다.
- selected=current이면 상세 pane에서 Stage title/purpose/boundary/Gate list를 반복하지 않고 dependency, exact count, group 근거만 보조로 둔다. selected!=current이면 실제 current Stage notice와 선택 Stage boundary/Gate list를 유지한다.
- Gate groups는 `auto-fit/minmax`로 가용 폭을 사용한다. generic group label/code는 primary에서 숨기고, Package-sourced Korean primary label과 required secondary code는 유지한다.
- listbox direct child Scope 묶음에 named `role=group`을 적용했다. option, aria-selected, aria-current, roving tabindex, Up/Down/Home/End 계약은 변하지 않았다.
- role status와 freshness가 같은 한글이면 한 번만 표시한다. raw project slug는 Hero에서 제거하고 collapsed technical evidence에 project identifier를 보존했다.

## 검증 영수증

- targeted frontend: 5 passed
- frontend: 44 passed
- Node: 64 passed
- security: 16 passed
- browser harness: 3 passed
- browser: desktop 1440×900, mobile 390×844, phone 375×812, landscape 844×390 × (Cherry Note 10 Stages + OUTCOME 8 Stages) = 72 states
- browser facts: listbox ownership, exact Gate count, current-detail dedupe, adaptive groups, role copy, Hero primary identity PASS; clipping/ellipsis/intersection/viewport escape/document overflow/English/fallback 0; controls>=44px; text>=11px; contrast>=4.5; focus contrast>=14.83
- Stage33: Package Korean primary labels 9, secondary codes 9, source checks 57
- isolated build: `index-CILj_dlQ.js`
- public boundary: API/HTML/bundle/rendered UI prohibited identifiers=0
- mutation matrix: 24/24 = 405 `read_only`
- scope: 17 product/runtime/test paths; Desk/Slack/relay/provider dependency 0
- runbook and `git diff --check`: PASS
- kill-ai-slop scan: 기존 login/legacy/brand decision 7 hits를 triage했고 이번 correction에서 새 decorative surface, glow, pill, font, dependency를 추가하지 않았다.

## 열린 경계

- I11 fresh independent UX & Product QA: pending
- I12 Cherry acceptance: pending
- C1/C2, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`: open

## Second fresh QA display-condition correction

- prior candidate: `ffd0aa9cebf6651b5f2fd0b8f62b714442717f76`
- verdict: `NEEDS_REVISION`; prior four blockers closed, structural IA PASS
- remaining defects: generic-only aggregate group repetition, stale NOW status double display
- red-first: missing `meaningfulGateGroups`, unavailable source-labeled group projection, stale count 2를 각각 실패로 재현
- correction: generic/unlabeled groups project to no primary section; only source-labeled groups render. stale status remains visible in headline exactly once and is removed from metadata.
- targeted frontend: 2 passed
- full frontend/Node/security: 45/64/16 passed
- browser harness: 3 passed
- browser: 4 viewports × 18 Stages = 72 states; each viewport `sourceGroupStates=1`, `genericGroupSections=0`, `staleNowCount<=1`
- Stage33: Korean primary labels 9, secondary codes 9, source checks 57
- isolated build: `index-CYdBJNLy.js`
- public boundary prohibited identifiers=0; mutations 24/24=405; scope 17; runbook/diff PASS
- public origin·Quick Tunnel·hostname: Builder mutation 0
- `false_completion_count=13` 보존
