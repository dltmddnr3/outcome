# OUTCOME Stage 8 C1 한글화 Fresh QA correction Gate

Outcome: fresh UX & Product QA가 발견한 한글 placeholder와 raw 영문 오류를 제거해 Cherry Note와 OUTCOME 모두에서 현재 위치와 다음 행동을 30초 안에 이해할 수 있게 한다.

Authority: `docs/STAGE8_C1_KOREANIZATION_FRESH_UX_QA_399ac9d.md`의 `NEEDS_REVISION`에 따른 OUTCOME-only Builder correction. C1·C2와 외부 완료 경계는 계속 열어둔다. 누적 `false_completion_count=13`을 보존한다.

- [x] C1K1: 현재 렌더 가능한 미완료 Gate 중 11개(`ANQ1–ANQ8`, `MC7–MC9`)에 source ID 기반 자연스러운 한글 설명을 제공한다.
  PROVES: actionable_gate_copy
  CHECK: npm run test:dashboard -- --testNamePattern='현재 렌더 가능한 미완료 완료 조건은 모두 자연스러운 한글 설명을 갖는다'
  EXPECT: renderable unclosed Gate fallback count=0
  EVIDENCE: red-first에서 fallback 11건을 재현한 뒤 source ID mapping을 추가했고, 현재 렌더 가능한 미완료 완료 조건 22개 전체의 fallback 0을 확인했습니다.
- [x] C1K2: 현재 렌더되는 여섯 evidence-axis source value를 source ID 기반 한글 상태로 표시한다.
  PROVES: actionable_axis_copy
  CHECK: npm run test:dashboard -- --testNamePattern='현재 렌더되는 근거 축 값은 모두 자연스러운 한글 상태를 갖는다'
  EXPECT: rendered axis fallback count=0
  EVIDENCE: red-first에서 fallback 6건을 재현한 뒤 여섯 source value mapping과 전수 브라우저 translation fallback 0을 확인했습니다.
- [x] C1K3: React 인증 화면의 `invalid_credentials`와 `too_many_attempts`를 사용자용 한글 오류로 표시한다.
  PROVES: auth_error_localization
  CHECK: npm run test:dashboard -- --testNamePattern='인증 오류 식별자를 사용자용 한글로 바꾼다'
  EXPECT: raw API error identifier visible count=0
  EVIDENCE: red-first에서 raw `invalid_credentials` 노출을 재현했고, 두 알려진 식별자와 알 수 없는 backend 식별자를 자연스러운 한글 오류로 투영하는 3개 assertion이 통과했습니다.
- [x] C1K4: 사용자 화면의 `completion_authority=false`와 `프로젝트 ID`를 각각 자연스러운 한글 의미와 `프로젝트 식별자`로 바꾸고, iPhone·MacBook·Cherry 같은 실제 고유명사만 Gate와 scanner 예외에 명시한다.
  PROVES: allowlist_contract_parity
  CHECK: npm run test:browser
  EXPECT: scanner allowlist equals written K3 proper-noun/technical-evidence contract
  EVIDENCE: raw schema 표현을 제거하고 `프로젝트 식별자`로 교정했으며, written K3와 scanner가 Cherry·iPhone·MacBook을 고유명사로 명시해 desktop/mobile 전수 영문 검사가 통과했습니다.
- [x] C1K5: 프로젝트 2개 × 작업 단계 18개 × desktop/mobile 36상태에서 허용 예외 밖 영문 prose=0, translation fallback=0, geometry violation=0을 자동 검증한다.
  PROVES: exhaustive_localization
  CHECK: npm run test:browser
  EXPECT: unexpectedEnglish=0 translationFallback=0 clipped=0 intersections=0 viewportEscape=0 documentOverflow=0
  EVIDENCE: 별도 detached build에서 desktop/mobile 각각 projects=2, selectedStages=18, unexpectedEnglish=0, translationFallback=0, clipped=0, intersections=0, viewportEscape=0, documentOverflow=0을 확인했습니다.
- [x] C1K6: 전체 frontend/Node/security/public boundary/mutation/scope/runbook/build 회귀를 통과하고 exact candidate 증거를 만든다.
  PROVES: regression
  CHECK: npm test && npm run test:security && npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && npm run build && git diff --check
  EXPECT: exit 0
  EVIDENCE: frontend 22/22, Node 61/61, security 16/16, local public boundary prohibited identifiers=0, mutation 24/24=405, scope/runbook/build/browser와 diff check가 통과했습니다. 공유 public dist를 변경하지 않은 isolated production asset은 `index-puw5_elB.js`입니다.
- [ ] C1K7: Planner exact activation 후 새 fresh affected UX & Product QA가 두 프로젝트 30초 과업과 전수 상태를 독립 PASS한다.
  PROVES: independent_qa
  EVIDENCE: pending
- [ ] C1K8: fresh QA PASS 뒤 Cherry가 실제 공개 화면에서 C1을 직접 재평가한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: C1K7 Builder에게 독립 QA 실행·판정 또는 exact public activation 권한이 없으므로 Planner 활성화 뒤 fresh affected UX & Product QA가 수행해야 합니다.
ABANDON: C1K8 C1 재평가는 fresh QA 뒤 Cherry의 실제 사용과 명시적 승인 전용입니다.
