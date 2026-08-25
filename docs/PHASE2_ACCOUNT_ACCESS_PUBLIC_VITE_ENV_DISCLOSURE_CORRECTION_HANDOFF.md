# Phase 2 · 공개 Vite 환경 메타데이터 가림 보정 인계

상태: `PLANNER HANDOFF · B12 REOPENED · NO SECRET VALUE COPIED`

## 관측

- 공개 후보: `c43e28d551b7cdb5dcae29c8fe511bcbc77544a3`
- 공개 트리: `9ac01024808114ac14bcd5a780fef81473ad8539`
- 공개 에셋: `index-CHki_jxn.js`
- 로컬 공개 경계: API/HTML/bundle/rendered 금지 식별자 `0`
- 실제 공개 경계: bundle `fullHash=1`
- 공개 화면 `200`, 비공개 설정 `enabled=false`, private session/workspace `401`, 공개 변경 요청 `405`는 유지됐다.

전체 해시 값은 이 문서·Gate·메시지에 복사하지 않았다. 마스킹한 주변 문맥은 Vercel이 자동 제공한 `VITE_VERCEL_GIT_*` 커밋 메타데이터가 클라이언트 번들에 직렬화됐음을 보여 주었다. 이는 비밀키 노출로 판정하지 않지만 OUTCOME 공개 정보 가림 계약 위반이다.

## 원인 경계

Clerk React 의존성 추가 뒤 클라이언트 코드 경로에서 동적 `import.meta.env` 접근이 포함됐다. Vite의 기본 `VITE_` 접두사는 Vercel 자동 Git 메타데이터 이름도 클라이언트 허용 환경으로 취급하므로 로컬에 없던 배포 환경 정보가 공개 번들에 들어갔다.

## 구현 Outcome

- Vite 클라이언트 환경 접두사를 OUTCOME 전용 공개 이름으로 제한하고 `VITE_VERCEL_*`를 번들에서 제외한다.
- OUTCOME 비공개 인증은 빌드 환경값을 사용하지 않고 `/api/private/config`의 활성 상태에서만 공개 가능한 Clerk publishable key를 런타임에 받는 구조를 유지한다.
- 합성 `VITE_VERCEL_GIT_COMMIT_SHA`, message, ref가 있는 빌드에서도 어느 값도 번들에 나타나지 않는다.
- ClerkProvider, Google/email, Apple link-only 및 callback marker는 빌드에 남는다.
- 공개 API/HTML/bundle/rendered 금지 식별자 `0`, 변경 요청 405, 비공개 비활성, 고정 영수증과 두 프로젝트 지도를 유지한다.

## 실패 우선·필수 검증

1. 보정 전 합성 Vercel Git 환경을 넣은 빌드에서 전체 해시 또는 메타데이터 문자열 탐지를 재현한다.
2. 보정 후 같은 합성 환경 빌드에서 해당 값 탐지 `0`을 증명한다.
3. 집중 회귀, 전체 테스트, 보안, 공개 경계, 변경 요청, 범위, Vercel 빌드를 통과한다.
4. Parent가 정확한 후보를 push·배포한 뒤 실제 공개 API/HTML/bundle/rendered 경계를 다시 측정한다.

## 권한 경계

허용 파일은 Vite 설정, 직접 관련 검사·테스트와 한 개의 Builder 증거 문서뿐이다. Planner Gate/Map/스냅샷, 인증 제품 흐름, 외부 제공자·환경·비밀값·배포·출시와 `docs/ROADMAP 2.md`는 Builder 범위가 아니다.

종료 문구는 `PUBLIC_ENV_REDACTION_CODE_READY_ONLY` 또는 `BLOCKED`다. B12는 실제 공개 배포 재검증 전까지 열린다.
