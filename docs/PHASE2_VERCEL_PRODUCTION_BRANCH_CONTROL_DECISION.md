# Phase 2 · Vercel Production branch control 결정안

상태: `DECISION REQUIRED · NO EXTERNAL MUTATION`

## 문제

현재 Vercel 프로젝트는 GitHub `main`을 Production branch로 추적한다. `2026-08-25 KST` 승인된 문서-only push가 새 Production deployment를 만들고 공개 별칭을 갱신해 HP1의 Production 불변 조건을 위반했다. 에셋 바이트는 동일했지만 commit/tree 영수증이 달라졌으므로 source-grounded boundary에서는 무변경으로 취급할 수 없다.

## 확인된 현재 사실

- Git provider: GitHub
- Production branch: `main`
- `main` push 결과: Production deployment `READY`, 공개 별칭 자동 갱신
- 이전과 현재 deployment: 둘 다 rollback 후보
- 공개 코드 에셋: 동일
- 공개 API 경계: `GET 200`, mutation `405`, 금지 Clerk 식별자 `0`
- 현재 HP1 판정: `HARD STOP · P2 OPEN`

## 선택지

### A. `release` branch를 Production branch로 분리 — 추천

- GitHub `release`를 Vercel Production branch로 지정한다.
- `main`과 기능 branch는 Preview deployment만 생성한다.
- Production 변경은 Cherry가 승인한 exact candidate를 `release`로 이동하는 별도 release action으로 제한한다.
- 장점: OUTCOME의 Builder → QA → Release Audit → Cherry acceptance → release 경계가 Git/Vercel 동작과 일치한다.
- 비용: `release` branch 보호와 promotion runbook이 추가로 필요하다.

### B. `main` 유지 + Production domain 자동 할당 비활성

- `main` push는 staged Production build를 만들되 공개 domain을 자동 갱신하지 않도록 설정한다.
- 장점: branch 구조 변화가 적다.
- 위험: Production target build 자체는 계속 생성되며 Preview/Production 의미가 사용자 계약과 덜 직관적으로 맞는다.

### C. Git 자동 deployment 전체 비활성

- 모든 배포를 명시적 CLI/API action으로만 만든다.
- 장점: 자동 외부 변경이 없다.
- 위험: Preview 피드백 속도와 운영 편의가 낮고, 수동 credential·rollback 운영 부담이 커진다.

## 추천 계약

`A`를 채택한다.

1. 현재 Production을 이전 exact deployment로 instant rollback한다.
2. 공개 `commit/tree/asset`, `200/405`, 금지 식별자 `0`을 재검증한다.
3. 별도 승인으로 GitHub `release` branch를 생성·보호하고 Vercel Production branch를 `release`로 변경한다.
4. 비-`release` branch push가 Preview만 생성하는지 직접 검증한다.
5. 이후 Production은 fresh QA, 별도 fresh Release Audit, Cherry acceptance와 정확한 release 승인이 모두 닫힌 candidate만 변경한다.

## 승인 단위

아래 두 외부 변경은 분리한다.

- `RECOVERY`: 이전 Production deployment로 instant rollback
- `BRANCH_CONTROL`: GitHub `release` branch 생성·보호 + Vercel Production branch를 `release`로 변경

한 승인으로 두 변경을 묶지 않는다. Production release, Supabase, DNS·도메인, Clerk Production, 결제, Phase 완료는 어느 승인에도 포함되지 않는다.

## 공식 근거

- Production branch push는 Production, 다른 branch push는 Preview deployment를 만든다: <https://vercel.com/docs/git>
- Production branch를 Project Settings에서 변경할 수 있다: <https://vercel.com/docs/git#production-branch>
- Instant rollback은 과거 Production deployment로 domain alias를 되돌리며 rebuild하지 않는다: <https://vercel.com/docs/deployments/promoting-a-deployment#instant-rollback>
- Preview를 명시적으로 검증한 뒤 Production으로 승격하는 흐름: <https://vercel.com/docs/deployments/promote-preview-to-production>
