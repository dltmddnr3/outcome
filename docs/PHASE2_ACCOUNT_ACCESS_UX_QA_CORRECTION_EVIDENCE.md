# Phase 2 · Account Access UX QA Correction Evidence

Status: `BUILDER_CANDIDATE_ONLY` — fresh UX/Product QA, Release Audit, Cherry acceptance, Phase completion은 별도다.

## Immutable base

- Base commit: `dcafb81e58ed1b963400723a398f2861ec1de1bf`
- Base tree: `d6d715f4ef787aae490343a369b30dcb3bcf7636`
- Candidate commit/tree와 built asset은 이 문서를 포함한 최종 Git object에 대해 handoff에서 별도로 고정한다.

## Red-first reproduction

- `npx vitest run src/components/AccountWorkspace.test.tsx`: 5개 중 2개 실패. ready 상태에 `data-private-project`가 0개였고 위계/current-selected 표식이 없었으며, login 상태에 공급자 중립 adapter/비-OAuth 표식과 logout journey가 없었다.
- `npx vite build && npm run test:account-access-browser`: `mobile/login 200% zoom horizontal overflow=250`으로 실패했다. account workspace에도 전역 `body min-width:320px`가 적용되어 390px viewport의 200% zoom에서 유효 폭을 초과했다.

## Correction proof

- Ready private response는 Cherry Note와 OUTCOME 두 projection을 프로젝트 전환 controls로 렌더링하고, 각 projection의 Phase → Scope → Stage → Gate를 탐색한다.
- `aria-current="step"`/`data-actual-current`는 source current만 소유하며, `aria-selected`는 사용자가 탐색한 위치를 나타낸다. 비현재 Stage 선택 뒤에도 실제 현재 marker가 유지되는 browser assertion이 있다.
- Login/logout은 서버 생성 시 명시적으로 주입한 synthetic provider-neutral adapter에서만 작동한다. 기본/production server에는 adapter가 없으므로 두 POST 모두 기존과 동일하게 `405 {"error":"read_only"}`다. UI는 `실제 OAuth 연결 아님`을 명시하며 token은 response body에 노출되지 않고 HttpOnly/SameSite cookie로만 전달된다.
- Account workspace에만 `min-width:0`을 적용해 stable dashboard의 기존 responsive contract는 바꾸지 않았다. 390×844와 375×812의 모든 settled state, loading, ready journey를 200% CSS zoom에서 측정한 horizontal overflow는 0이다.
- Browser assertions은 두 project, 네 hierarchy columns, Gate, project switching, current-vs-selected, keyboard, login/loading/ready/logout, injected failure, touch target, text size, contrast, reduced motion, truncation과 overflow를 검증한다.

## Final verification

- `npm run test:account-access`: Node 18/18, UI 5/5.
- `npm test`: frontend 64/64, Node 97/97.
- `npm run test:security`: 28/28; stable snapshot prohibited disclosure 0, Gate evidence fields 0.
- `npm run check:public-boundary`: API/HTML/bundle/rendered UI prohibited identifiers 0.
- `npm run check:mutations`: 32/32 = 405; API read-only JSON 28/28.
- `npm run build:vercel`: PASS; pre-commit proof asset `index-fGSYVODK.js`.
- `npm run test:account-access-browser`: PASS; 1440×900, 390×844, 375×812; mobile/phone 200% zoom overflow 0.
- `npm run test:stable-browser`: PASS; 1440×900, 390×844, 375×812, 844×390; overflow/intersection/clipping 0, text ≥11px, controls ≥44px.
- `npm run test:portfolio-browser`: PASS; 3 isolated fixture projects at desktop/mobile.
- `npm run build:isolated`, `npm run check:scope`, `npm run check:runbook`: PASS.

## Rollout, rollback, limitations

- Rollout: fresh QA는 exact candidate commit/tree에서 private account route에 synthetic adapter를 명시적으로 주입해 두 project ready journey와 200% zoom을 재검증한다. 실제 provider나 deployment에는 이 candidate가 연결하지 않는다.
- Rollback: candidate commit의 inverse만 적용하면 된다. migration, provider, secret, database, domain, deployment mutation은 없어 data rollback은 없다.
- Limitations: 실제 Clerk/Supabase/OAuth/provider preview proof가 아니다. 실제 provider login, hosted database, deploy, release, QA PASS, Cherry acceptance와 Phase completion은 열려 있다.
