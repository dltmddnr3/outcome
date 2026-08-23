# OUTCOME Stage 8 C1 한글화 수정 Gate

Outcome: Cherry가 OUTCOME 화면을 30초 안에 직관적으로 이해할 수 있도록 사용자에게 보이는 영문 UI 문구를 자연스러운 한글로 전환한다.

Authority: Cherry C1 사용 피드백에 따른 OUTCOME-only Builder 수정. C1·C2, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 계속 열어둔다. Activation evidence correction 뒤 cumulative `false_completion_count=13`.

## Builder

- [x] K1: 사용자에게 보이는 계층 명칭을 `프로젝트 → 큰 단계 → 범위 → 작업 단계 → 완료 조건`으로 일관되게 표시한다.
  PROVES: localization_copy
  CHECK: npm run test:dashboard -- --testNamePattern='한글 계층'
  EXPECT: exit 0; rendered hierarchy vocabulary is exactly 프로젝트 → 큰 단계 → 범위 → 작업 단계 → 완료 조건
  EVIDENCE: targeted 한글 계층 test 1/1 PASS; 전수 브라우저 18개 작업 단계 × 2 viewport에서 승인된 다섯 명칭을 확인했습니다.
- [x] K2: 역할, 현재 작업, 현재/다음 위치, 상태, 진행 근거, 체크리스트, 버튼, 안내·빈 상태·오류 문구를 자연스러운 한글로 표시한다.
  PROVES: localization_copy
  CHECK: npm run test:dashboard -- --testNamePattern='한글 운영 문구'
  EXPECT: exit 0; roles, states, NOW, current/next, checklist and fallback copy are Korean
  EVIDENCE: targeted 한글 운영 문구 test 1/1 PASS; 인증 화면, 네 역할, 현재 작업, 상태, GitHub 근거, 상세·빈 상태·오류 fallback을 포함합니다.
- [x] K3: `OUTCOME`, `Cherry Note`, `GitHub`, `Cherry`, `iPhone`, `MacBook`과 소스 코드·Stage/Gate 식별자, commit/tree/asset 식별자처럼 의미 보존이 필요한 고유명사·기술 증거만 영문 예외로 허용한다.
  PROVES: source_truth_preserved
  CHECK: npm run test:dashboard -- --testNamePattern='기술 식별자 보존'
  EXPECT: exit 0; presentation translation preserves stable IDs and technical evidence values
  EVIDENCE: targeted 기술 식별자 보존 test 1/1 PASS; 원본 객체와 stable ID는 byte-level value 비교에서 불변이고 GitHub 저장소/ref도 보존됩니다.
- [x] K4: 데스크톱 1440×900과 모바일 390×844에서 한글 문구가 잘리거나 겹치지 않고 가로 스크롤이 생기지 않는다.
  PROVES: responsive_korean_ui
  CHECK: npm run test:browser
  EXPECT: every project × every selected Stage at 1440×900 and 390×844 reports clipped=0 intersections=0 viewportEscape=0 documentOverflow=0
  EVIDENCE: 각 viewport에서 projects=2, selectedStages=18, clipped=0, intersections=0, viewportEscape=0, documentOverflow=0.
- [x] K5: 렌더링된 전체 프로젝트·Stage 상태를 순회해 허용 목록 밖의 사용자용 영문 문구가 0건임을 자동 검사한다.
  PROVES: localization_coverage
  CHECK: npm run test:browser
  EXPECT: every project × every selected Stage at both viewports reports unexpectedEnglish=0 outside the explicit allowlist
  EVIDENCE: 두 viewport 모두 프로젝트 2개와 source snapshot의 작업 단계 18개 전체를 순회해 unexpectedEnglish=0. 허용 목록은 지정 고유명사와 source ID/Gate code/repository/ref/commit/tree/asset 식별자로 한정했습니다.
- [x] K6: 기존 기능·보안·공개 읽기 전용 경계와 전체 테스트·프로덕션 빌드를 회귀 없이 통과한다.
  PROVES: regression
  CHECK: npm test && npm run test:security && npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run build && git diff --check
  EXPECT: exit 0
  EVIDENCE: frontend 19/19, Node 61/61, security 16/16, public boundary prohibited identifiers=0, mutation 24/24, scope/runbook, production build와 git diff check PASS. Planner exact activation 뒤 public GET 200, local/public mutation 각각 24/24, local/public prohibited identifiers=0, remote desktop/mobile 전수 geometry와 unexpectedEnglish=0을 확인했습니다.

## C1 재검증 경계

- [ ] K7: Builder 후보가 immutable commit/tree/asset과 실제 공개 화면 증거를 보고한 뒤, fresh UX & Product QA가 한글화·30초 이해도·데스크톱·모바일을 독립 검증한다.
  PROVES: independent_qa
  EVIDENCE: fresh QA `docs/STAGE8_C1_KOREANIZATION_FRESH_UX_QA_399ac9d.md` returned `NEEDS_REVISION`; correction gates are in `GATES_STAGE8_C1_KOREANIZATION_CORRECTION.md`.
- [ ] K8: fresh QA PASS 이후 Cherry가 실제 화면을 다시 사용하고 C1을 직접 승인한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: K7 Builder에게 독립 QA 실행·판정 권한이 없으며 exact candidate 활성화 후 fresh UX & Product QA가 수행해야 합니다.
ABANDON: K8 C1은 Cherry 실제 사용과 명시적 승인 전용이므로 Builder가 닫지 않습니다.
