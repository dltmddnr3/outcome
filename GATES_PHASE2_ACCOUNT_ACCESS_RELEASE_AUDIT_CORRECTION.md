# Phase 2 · Account Access Release Audit Browser Correction Gates

Outcome: canonical generic browser regression을 sibling project availability와 분리해 exact OUTCOME checkout에서 재현 가능하게 만들고 fresh Release re-Audit에 전달한다.

- [ ] R1: current `npm run test:browser` default runtime의 external Cherry Note Package timeout이 red-first로 재현된다.
  EVIDENCE: pending
- [ ] R2: generic browser runtime이 repository-contained validated Package fixture만 사용하며 fixture root escape, invalid/duplicate/unknown project를 fail-closed로 거부한다.
  EVIDENCE: pending
- [ ] R3: assertion 16/16을 완화하지 않고 four-view generic browser가 three valid projects와 모든 hierarchy state를 검증한다.
  EVIDENCE: pending
- [ ] R4: live/default Package loader, deployment snapshot, stable/portfolio/remote/account browsers와 full/security/public regressions이 유지된다.
  EVIDENCE: pending
- [ ] R5: exact commit/tree/asset, changed paths, red/final commands, limitations와 rollback이 immutable Builder handoff로 전달된다.
  EVIDENCE: pending

ABANDON: `config/outcome-projects.json` 변경, missing external source를 fresh/valid로 위조, assertion 완화, product UI 변경, provider/resource/deploy mutation, Release Audit self-pass와 Cherry acceptance는 포함하지 않는다.
