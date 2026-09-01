# OUTCOME Model v2 selective-context local activation

Outcome: The exact Cherry-accepted Model v2 carrier becomes the verified local session-bootstrap default, loading only the current snapshot, Gate, handoff and proportional skills; unsupported enforcement, source drift and role mismatch fail closed. Preview, Production, release and Phase transition are excluded.

Status: **CHERRY-AUTHORIZED LOCAL ACTIVATION · BUILDER IMPLEMENTATION NOT STARTED · PREVIEW/PRODUCTION/RELEASE/PHASE EXCLUDED**

- [x] D1: Exact accepted source and authority boundary are fixed.
  CHECK: git cat-file -e d726e200a9500658ae1fee5781d1d908a6b1a522^{commit} && git show d726e200a9500658ae1fee5781d1d908a6b1a522:GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md | rg -q 'MODEL V2 13/13 CHERRY ACCEPTED' && echo D1_PASS
  EXPECT: `D1_PASS`
  EVIDENCE: Accepted carrier `d726e200a9500658ae1fee5781d1d908a6b1a522`; Cherry instructed `추천 실행 순서대로 진행해줘`. This authorizes local activation work only, not Preview, Production, release or Phase transition.

- [ ] B1: Local startup uses the accepted Model v2 selective-context bootstrap with no opt-in flag and no persistent/shared environment mutation.
  CHECK: pending Builder candidate
  EXPECT: default schema `2`, authority `projection_only`, persistent mutation `0`
  EVIDENCE: pending

- [ ] B2: Exact explicit rollback returns the unchanged v1 object and serialized bytes and leaves no listener, process, flag or task-owned residue.
  CHECK: pending Builder candidate
  EXPECT: identity and byte equality; residue `0`
  EVIDENCE: pending

- [ ] B3: The compiled default load set contains only `AGENTS.md`, one content-addressed current snapshot, one current canonical Gate, at most one current handoff/checkpoint, common substantial-work skills and at most one work-type role skill.
  CHECK: pending Builder candidate
  EXPECT: no unrelated Gate, correction chain, raw conversation, archived receipt sweep or unrelated skill
  EVIDENCE: pending

- [ ] B4: Planner, Builder, UX & Product QA and Release Audit work types deterministically select an allowlisted role context; no-role work selects no role skill, and mismatches fail closed before execution.
  CHECK: pending Builder candidate
  EXPECT: exact role mapping; wrong-role and unknown-work negative controls fail closed
  EVIDENCE: pending

- [ ] B5: Every on-demand source or skill expansion requires a reason, exact source digest and work ID; source digest drift, missing input or unsupported session-enforcement capability produces a finite hold rather than simulated activation.
  CHECK: pending Builder candidate
  EXPECT: deterministic finite holds; retry/fallback/false completion `0`
  EVIDENCE: pending

- [ ] B6: The local adapter emits a public-safe loaded/skipped-source receipt and never exposes physical task/session identifiers, locators, local paths, raw prompts/results, credentials or canonical-transition authority.
  CHECK: pending Builder candidate
  EXPECT: private survival `0`; authority remains projection-only
  EVIDENCE: pending

- [ ] Q1: Fresh independent UX & Product QA reproduces default activation, rollback, all four role manifests, on-demand expansion, privacy and fail-closed negative controls on the exact immutable candidate.
  CHECK: pending fresh QA receipt
  EXPECT: `PASS_UX_PRODUCT_QA_ONLY`
  EVIDENCE: pending

- [ ] O1: Existing bound role tasks receive one non-mutating canary handoff each and observed turns prove the compact context contract without duplicate dispatch or claiming unobservable reads.
  CHECK: pending operational canary receipts
  EXPECT: four singular bindings; new turns observed; duplicate/replay `0`; unsupported observation held explicitly
  EVIDENCE: pending

- [ ] O2: One safe same-role session replacement uses only the content-addressed snapshot, current Gate, active work and next action; successor readiness is observed before predecessor archival.
  CHECK: pending rotation receipt
  EXPECT: continuity ready; raw-history replay `0`; predecessor recoverable
  EVIDENCE: pending

- [ ] A1: Separate fresh Release Audit validates the coherent implementation and operational evidence without inferring Preview, Production, release or Phase transition.
  CHECK: pending fresh Audit receipt
  EXPECT: `PASS_RELEASE_AUDIT_ONLY`
  EVIDENCE: pending

- [ ] C1: Cherry accepts the exact locally activated selective-context result; Preview, Production, release and Phase transition remain separate decisions.
  CHECK: manual authority
  EXPECT: exact bounded Cherry acceptance
  EVIDENCE: pending

## Stop conditions

- Do not infer actual Codex context enforcement from a generated manifest or prompt.
- Do not replay an unobserved dispatch. Revalidate binding and create a new attempt only after changed evidence.
- Do not overwrite, reset, clean or absorb the current user-owned dirty checkout.
- Do not activate Preview, Production, release or Phase transition under this Gate.
