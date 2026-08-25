# Phase 2 · Account Access Release Audit Browser Correction Evidence

Status: `BUILDER_CANDIDATE_ONLY` — fresh Release re-Audit, Cherry acceptance, release와 Phase completion은 별도다.

## Immutable base

- Base commit: `d09d0992415f2724ece3882768f829a2ecaa8c9b`
- Base tree: `054ad8078f3726010e20bed3c2fa7191927a1d51`
- Candidate commit/tree와 built asset은 이 문서를 포함한 최종 Git object의 post-commit build에서 별도로 고정한다.

## Red-first reproduction

- `npm run build:isolated && npm run test:browser`
- Assertion half: 16/16 PASS.
- Runtime half: 30초 동안 `.oc-dashboard`를 기다린 뒤 `TimeoutError`로 종료했다.
- 원인 경계: default registry의 external `../Cherry Note` Package가 exact checkout에서 unavailable 상태라 dashboard model이 fail-closed 됐다.

## Correction proof

- `scripts/browser-check.mjs`만의 입력 경계를 `test/fixtures/portfolio-registry.json`으로 고정했다. default registry, Package loader, collector, server와 제품 UI는 변경하지 않았다.
- loader가 resolve한 모든 root는 `path.relative()` 결과가 비어 있지 않고 `..`로 시작하지 않으며 absolute가 아닌 경우에만 허용한다. 따라서 모두 repository의 `test/fixtures` 하위에 있어야 한다.
- 수집 결과가 정확히 3개이고, 모두 `valid`이며 project ID가 3개 모두 distinct일 때만 isolated server를 시작한다. loader 자체의 malformed/duplicate/traversal fail-closed 검증은 package model 39/39에 포함된다.
- isolated server에는 미리 검증한 fixture model만 `collectPackages`로 주입한다. `verifyAllDashboardStates`는 수정하지 않고 1440×900, 390×844, 375×812, 844×390에서 세 project를 모두 검증한다.
- 성공 출력은 `repository-contained deterministic fixture; live external source not exercised`를 명시한다. 이는 deterministic UI regression 증거이며 live external Package availability 증거가 아니다.

## Final verification

- `npm run test:browser`: assertion 16/16 + 4 viewports × 3 projects PASS; hierarchy selections 9, selected Stages 3 per viewport.
- `npm run test:package-model`: 39/39.
- `npm run test:account-access`: Node 18/18, UI 5/5.
- `npm test`: frontend 64/64, Node 97/97.
- `npm run test:security`: 28/28; prohibited disclosures 0, raw Gate evidence fields 0.
- `npm run build:vercel`: PASS; pre-commit asset `index-fGSYVODK.js`; stable-host 8/8.
- `npm run build:isolated`: PASS; asset `index-fGSYVODK.js`.
- `npm run test:account-access-browser`: PASS; 3 viewports × 9 states + loading/ready journey; 200% zoom overflow 0.
- `npm run test:stable-browser`: PASS; 4 viewports × 2 projects.
- `npm run test:portfolio-browser`: PASS; desktop/mobile × 3 isolated projects.
- `OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run test:remote-browser`: PASS; existing public deployment desktop/mobile. 이는 candidate deploy proof가 아니다.
- `npm run test:public`: 4/4.
- `npm run check:public-boundary`: prohibited identifiers 0.
- `npm run check:mutations`: 32/32 = 405; API read-only JSON 28/28.
- `npm run check:scope`, `npm run check:runbook`: PASS.

## Rollout, rollback, limitations

- Rollout: fresh Release Auditor가 exact candidate commit/tree에서 isolated build 후 `npm run test:browser`를 실행하고 deterministic fixture boundary 출력과 four-viewport 결과를 확인한다.
- Rollback: candidate commit의 inverse만 적용한다. 제품/runtime/config/data/deployment mutation이 없어 별도 data rollback은 없다.
- Limitations: 이 fixture PASS는 sibling `../Cherry Note`의 현재 상태, live Package availability, public candidate deployment, provider/database resource 또는 release readiness를 증명하지 않는다. Default loader는 계속 external source 문제를 fail-closed로 나타낸다.
