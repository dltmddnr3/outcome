# Stage 8 C1 정보 구조 리뉴얼 Builder 증거

- 관측일: 2026-08-24 KST
- 기준 parent: `36189276f17188cb8bb832b869ef6f0647793cd5`
- candidate asset: `index-B2epVH5T.js`
- 권한 경계: Builder product candidate만 생성하며 공개 origin·Quick Tunnel·hostname은 변경하지 않는다.
- `false_completion_count=13` 보존

## Red-first

새 IA 구현 전 targeted frontend에서 다음 4개가 모두 실패했다.

- compact activity band/role row 부재
- 하나의 flat current-flow marker 부재
- listbox roving keyboard helper 부재
- Hero-wide fill과 selected-detail gauge 잔존

교정 후 동일 계약과 `0/8 → 0%`, unavailable/total0 → gauge·percent 없음 검사가 통과했다.

## 구현 증거

- Hero는 첫 outer surface로 유지했고 Hero-wide fill을 제거했다. current Stage Gate의 fraction·integer percent·8px gauge는 Hero 우측 대표 블록 한 곳에서만 생성한다.
- NOW와 네 역할 연결은 desktop 한 band에서 `62/38` 축을 사용한다. 네 역할은 `44–56px` divider row이며 primary surface에서 Stage ID와 history를 제거했다. 해당 기술 근거는 마지막의 접힌 기술 증거로 이동했다.
- Phase·Scope·Stage·Gate는 한 current-flow surface와 한 left axis에서 같은 left/width 축을 쓴다. Scope journey만 유지하고 중복 Stage rail과 Gate row checklist를 제거했다.
- Stage explorer는 desktop `300px master + 24px gutter + detail`, 1100px 미만 `list → detail` 한 열이다. `listbox/option`, `aria-selected`, `aria-current=step`, roving tabindex 한 개와 Up/Down/Home/End를 구현했다.
- 모든 historical Stage 선택에서 Hero, current Phase/Scope/Stage, current Gate signature가 바뀌지 않았다. 탐색 상세는 실제 current Stage명을 직접 표시한다.
- mobile Scope journey는 수직 connector이고 CSS order 재배치를 사용하지 않는다.

## 검증 증거

- targeted frontend: 5 PASS
- full frontend: 39 PASS
- Node: 64 PASS
- security: 16 PASS
- browser harness: 3 PASS
- browser state sweep: `4 viewports × (Cherry Note 10 + OUTCOME 8) = 72/72`
- desktop 1440×900: master `300px`, gutter `24px`, flow left/width delta `0.00/0.00px`, horizontal Scope connector max gap `0.00px`
- mobile 390×844 및 375×812: vertical Scope journey, one-column explorer
- landscape 844×390: horizontal Scope journey와 one-column explorer
- 모든 viewport: clipped/intersections/viewportEscape/documentOverflow/ellipsis/unexpectedEnglish/translationFallback `0`; controls `>=44px`; text `>=11px`; contrast `>=4.5`; one H1와 sequential headings
- public-shaped local boundary: API/HTML/bundle/rendered UI prohibited identifiers `0`
- local mutation matrix: `24/24 = 405 read_only`
- scope: `17` product/runtime/test paths PASS
- runbook PASS
- isolated production build PASS
- `git diff --check` PASS

## 열린 경계

- I11 fresh independent UX & Product QA는 공개 candidate 활성화 뒤 별도 역할이 수행한다.
- I12 Cherry acceptance, C1/C2, R11, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 열려 있다.
- candidate activation과 rollback은 Planner 소유다.
