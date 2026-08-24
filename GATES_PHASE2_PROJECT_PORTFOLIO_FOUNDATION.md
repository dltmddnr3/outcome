# OUTCOME Phase 2 · Registered Package Portfolio Foundation Gates

Outcome: 세 번째 이후 프로젝트도 코드에 프로젝트 이름이나 로컬 경로를 추가하지 않고, 검증된 OUTCOME Package 등록만으로 같은 읽기 전용 포트폴리오와 결과 지도에서 안전하게 전환·조회할 수 있다.

- [x] P1: 프로젝트 레지스트리는 명시적 schema와 Package root/Contract/Map 입력을 가지며 기존 Cherry Note와 OUTCOME 기본 등록을 동일한 경로로 표현한다.
  PROVES: implementation
  EVIDENCE: exact candidate `1adcd073ebe2`의 versioned `config/outcome-projects.json`과 단일 registry loader가 기본 등록과 `OUTCOME_PROJECT_REGISTRY` override를 같은 schema로 검증한다. Fresh affected QA는 `docs/PHASE2_PROJECT_PORTFOLIO_FOUNDATION_FRESH_QA_1ADCD07.md`에 기록한다.
- [x] P2: 누락·형식 오류·중복 프로젝트·허용되지 않은 문서 경로는 fail closed하며 조용한 기본값 대체나 프로젝트 identity 혼합이 없다.
  PROVES: test
  EVIDENCE: fresh detached registry/parser negative tests PASS; 빈 registry, malformed schema, duplicate entry/project ID, absolute document path와 Package root traversal이 전체 입력을 거부하고 API override 오류는 503으로 fail closed한다.
- [x] P3: 새 프로젝트의 Project·Phase·Scope·Stage 사용자 표시명과 목적은 Package source metadata에서 오며, 프로젝트별 코드 번역표 추가가 등록 조건이 아니다.
  PROVES: implementation
  EVIDENCE: 새 project ID의 title/purpose는 Package Contract/Map source metadata에서 투영되며, 알려진 기존 ID 표현만 transitional override로 유지한다. Source metadata 없는 새 identity는 조용히 다른 프로젝트 이름을 빌리지 않는다.
- [x] P4: 세 프로젝트 이상 fixture에서 프로젝트 전환, 현재 위치, Phase→Scope→Stage→Gate 탐색, 모바일 progressive drill-down이 각 Package identity를 보존한다.
  PROVES: test
  EVIDENCE: first candidate `138e89dc407b`는 detached fixture가 외부 `../Cherry Note`에 의존해 browser timeout으로 거부했다. Corrected `1adcd073ebe2`는 self-contained 3-Package fixture에서 desktop 1440x900와 mobile 390x844 각각 projects=3, hierarchySelections=9, selectedStages=3, identity 보존, translation fallback/overlap/overflow=0으로 PASS했다.
- [x] P5: 로컬 레지스트리 경로와 source credential은 공개 snapshot/API/UI에 포함되지 않고, GET-only·mutation 405·completion authority false 경계를 유지한다.
  PROVES: security
  EVIDENCE: fresh detached security tests 27/27와 stable snapshot disclosure probe PASS; registry root/path/credential과 raw Gate evidence는 public projection에 없고 stable API는 GET-only, mutation 405, `completion_authority=false`를 보존한다.
- [x] P6: exact candidate가 전체 회귀와 fresh affected UX & Product QA를 통과하고 고정 공개 주소에서 Git commit/tree/asset과 일치한다.
  PROVES: evidence
  EVIDENCE: fresh affected QA PASS 뒤 candidate `7f32f429bfaf` / tree `bd80c35cc838` / asset `index-CrD1KR7s.js`를 production deployment `dpl_71n65XTmFni6NHZhCZC7p8QdGBQB`로 활성화했다. `https://outcome-five.vercel.app/cherry-note-dashboard`와 public API가 exact receipt를 반환했고 GET 200, desktop/mobile hierarchy 43 selections·20 Stages, fallback/overlap/overflow=0, prohibited disclosure=0, mutation 24/24=405를 통과했다. Gate-close-only descendant도 같은 asset과 snapshot boundary로 다시 배포·검증한다.

ABANDON: 실제 제3 프로젝트 등록은 그 프로젝트의 Contract·Map·Gates와 root authority가 제공된 뒤 별도 Gate로 수행한다.
ABANDON: 계정, 권한, durable database, 다중 PC/CLI collector, live session relay, dispatch, custom domain, release approval은 이 Stage 범위가 아니다.
ABANDON: C1, C2, H13, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 계속 open이다.
