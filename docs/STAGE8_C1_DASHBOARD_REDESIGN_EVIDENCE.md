# Stage 8 C1 진행 구조 재구성 Builder 근거

관측일: 2026-08-24 KST

시작 기준: `802af9e11028df01a7241bd7a4b26f7e2f3b39f2`

권한 경계: OUTCOME dashboard UI·tests·Builder Gate만 변경합니다. Package key·stable ID·진행 진실, Cherry Note iOS, 과거 QA/Audit, Desk·Slack·provider·relay는 변경하지 않습니다. R10/R11, C1/C2, Cherry 승인, release, MVP와 external completion은 열려 있습니다. cumulative `false_completion_count=13`을 보존합니다.

## Red-first

- Hero composition, Gate fill, active+fresh binding, current Phase/Scope/Stage index, rail state, selected-vs-current separation helper가 없는 기존 구현에서 targeted unit 6개가 모두 실패했습니다.
- 최소 source-derived helper와 새 composition을 적용한 뒤 같은 6개가 통과했습니다.

## 구현

- 공개 화면의 generic standalone heading을 제거하고 프로젝트 전환 뒤 Hero 하나에 프로젝트 이름·Outcome·현재 위치·다음 경계·원본 관측·새로고침을 모았습니다.
- Hero lime fill은 현재 Stage Gate의 available `closed/total`만 scale로 사용하고 `프로젝트 전체 진행률이 아닙니다`를 명시합니다. Gate 근거가 없으면 fill 없이 근거 없음으로 표시합니다.
- NOW와 네 역할 카드를 유지하며 actual `active + fresh` 역할 최대 한 개에만 lime outline/glow/live bars를 제공합니다. 반복 motion은 2.0–2.2초 transform/opacity만 사용하고 reduced-motion에서 정적으로 전환됩니다.
- 현재 Package ID로 큰 단계·범위·작업 단계 index/total과 현재 Gate closed/total을 계산해 점진적으로 좁아지는 네 행 funnel에 표시합니다.
- 현재 Phase Scope rail과 현재 Scope Stage rail은 완료·진행 중·대기·근거 없음을 Lucide icon과 한글 text로 함께 표시합니다.
- 현재 Stage의 남은 핵심 Gate를 먼저 표시하고, 다른 Stage 선택은 `탐색 중 · 실제 현재 위치 유지`로 분리해 current funnel 수치를 바꾸지 않습니다.
- build receipt, GitHub connector와 axes는 primary content 뒤 기본 접힘 native `기술 증거` disclosure로 이동했습니다.
- 빌드와 browser/public-boundary 검사는 live `dist/`가 아닌 `.outcome-runtime/candidate-dist`를 사용해 활성 public bytes와 startup receipt drift를 만들지 않습니다.

## UI 원칙 적용

- 기존 OUTCOME dark charcoal·lime·현행 typography·Lucide를 유지했습니다. 검색 결과의 generic amber/indigo palette와 luxury font는 brief와 충돌해 채택하지 않았습니다.
- 8px rhythm, 44px controls, visible 3px focus, 4.5:1 text contrast, no horizontal scroll, transform/opacity motion, native progressive disclosure를 적용했습니다.

## 검증

- Targeted red-first: 6 failed as expected; correction 후 6/6 PASS.
- Frontend: 28/28 PASS. Node: 61/61 PASS. Security: 16/16 PASS.
- Candidate public boundary: API/HTML/bundle/rendered UI prohibited identifiers=0.
- Mutation: local 24/24 = 405/read_only. Scope/runbook: PASS.
- Isolated production build: PASS; JS asset `index-J6-yBpxh.js`.
- Desktop 1440×900: projects=2, selectedStages=18, funnelCounts=true, technicalCollapsed=true, activeAnimation=0 for observed bindings, reducedMotionStatic=true, unexpectedEnglish=0, translationFallback=0, clipped=0, intersections=0, viewportEscape=0, documentOverflow=0, controls>=44, textContrast>=4.5, focusContrast=14.83.
- Mobile 390×844: 같은 18개 Stage와 동일한 zero-violation 결과, authoritativeOrder=true.
- CSS motion synthetic probe: normal live glow/bars animation present; reduced-motion animation names none.

## 활성화 경계

활성 공개 제품은 계속 `7222cf4d3a54` / tree `47b2353e5114` / asset `index-puw5_elB.js`, origin PID 33615, tunnel PID 88741입니다. Builder는 origin/tunnel을 종료·재시작하지 않았고 URL도 바꾸지 않았습니다.

이 문서를 포함하는 candidate는 Planner가 exact isolated rebuild한 뒤 origin만 교체하고 기존 tunnel을 유지해 public receipt·redaction·mutation·36상태를 재검증해야 합니다. 그 전에는 R10 fresh QA 준비 완료나 C1 승인으로 간주하지 않습니다.
