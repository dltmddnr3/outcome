# Phase 2 · Account Access Release Audit Browser Correction Gates

Outcome: canonical generic browser regression을 sibling project availability와 분리해 exact OUTCOME checkout에서 재현 가능하게 만들고 fresh Release re-Audit에 전달한다.

- [x] R1: current `npm run test:browser` default runtime의 external Cherry Note Package timeout이 red-first로 재현된다.
  EVIDENCE: base에서 assertion 16/16 PASS 뒤 `.oc-dashboard` 30초 TimeoutError를 재현했다. `docs/PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT_BROWSER_CORRECTION_EVIDENCE.md` 참조.
- [x] R2: generic browser runtime이 repository-contained validated Package fixture만 사용하며 fixture root escape, invalid/duplicate/unknown project를 fail-closed로 거부한다.
  EVIDENCE: browser script가 tracked portfolio registry를 명시하고 모든 resolved root의 fixture containment, 정확히 3개 valid/distinct IDs를 검사한 후 해당 model만 주입한다. Package loader negative suite 39/39 PASS.
- [x] R3: assertion 16/16을 완화하지 않고 four-view generic browser가 three valid projects와 모든 hierarchy state를 검증한다.
  EVIDENCE: `verifyAllDashboardStates` 무변경. `npm run test:browser` assertion 16/16과 4 viewports × 3 projects, hierarchySelections=9, selectedStages=3 PASS.
- [x] R4: live/default Package loader, deployment snapshot, stable/portfolio/remote/account browsers와 full/security/public regressions이 유지된다.
  EVIDENCE: package 39, account 18+5, frontend 64, Node 97, security 28, public 4, stable/portfolio/account/remote browsers, builds, redaction/mutations/scope/runbook PASS. Remote는 기존 public deployment read-only 회귀이며 candidate deploy proof가 아니다.
- [x] R5: exact commit/tree/asset, changed paths, red/final commands, limitations와 rollback이 immutable Builder handoff로 전달된다.
  EVIDENCE: correction evidence doc and Parent promotion pin base `d09d0992415f`, Builder `6f04a80503c3`, promoted main `0a76fe797f46`, tree `256c9151d315`, public asset `index-fGSYVODK.js`; page 200 and mutation 405. Rollback is the inverse single commit with no product/config/data mutation.

ABANDON: `config/outcome-projects.json` 변경, missing external source를 fresh/valid로 위조, assertion 완화, product UI 변경, provider/resource/deploy mutation, Release Audit self-pass와 Cherry acceptance는 포함하지 않는다.
