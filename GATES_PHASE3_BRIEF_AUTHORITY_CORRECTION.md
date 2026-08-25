# OUTCOME Phase 3 · Builder Brief Authority Correction Gates

- [x] C1: the Builder SAFE_HOLD is classified as a source-authority wording conflict, not a capability NO-GO.
  PROVES: evidence
  EVIDENCE: replacement Builder terminal result `SAFE_HOLD_SOURCE_AUTHORITY_CONFLICT`; changed paths `0`, Builder commit `0`, S1-S6 unchanged.
- [x] C2: immutable product baseline and execution authorization have separate names and meanings.
  PROVES: contract
  CHECK: rg -q 'immutable product baseline commit' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q 'execution authorization commit/tree' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && echo C2_PASS
  EXPECT: C2_PASS
  EVIDENCE: the brief now distinguishes the original product source from later Planner-only dispatch/binding wrapper commits.
- [x] C3: execution authorization must contain the exact brief hash and be a descendant of the immutable product baseline, but equality is explicitly not required.
  PROVES: test
  CHECK: rg -q 'required to contain this exact brief SHA-256' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q 'must be a descendant' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q 'not expected to equal' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && git merge-base --is-ancestor 7f8f1f08f5f552b919cf8b5f7486b5fbf286ba9e HEAD && echo C3_PASS
  EXPECT: C3_PASS
  EVIDENCE: ancestry check passes on the current Planner source; exact post-correction brief hash and authorization commit/tree are measured after commit and supplied privately.
- [x] C4: the correction changes only the brief contract and this gate; no product, provider or Gate completion state changes.
  PROVES: boundary
  CHECK: test "$(git status --short --untracked-files=all | rg -v 'docs/ROADMAP 2.md' | wc -l | tr -d ' ')" = 2 && git status --short --untracked-files=all | rg -q 'GATES_PHASE3_BRIEF_AUTHORITY_CORRECTION.md' && git status --short --untracked-files=all | rg -q 'docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md' && test "$(rg --no-filename -c '^- \[ \] S[1-6]:' GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md)" = 6 && echo C4_PASS
  EXPECT: C4_PASS
  EVIDENCE: task-owned delta is exactly two planning paths and S1-S6 remain open.
- [x] C5: Phase 2 HP1 P2, Phase 3 `0/43` and `EXTERNAL_OUTCOME_COMPLETE=false` remain unchanged.
  PROVES: test
  CHECK: rg -q 'Current: .*hosted-identity-preview · P2' docs/OUTCOME_MAP.md && rg -q 'Phase 3 실행 Gate `0/43`' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo C5_PASS
  EXPECT: C5_PASS
  EVIDENCE: authority correction and retry readiness do not prove execution progress.

ABANDON: this correction authorizes only redispatch of the same S1-S6 spike. It does not authorize product implementation, provider/resource mutation, QA, Audit, acceptance, push, deploy, release or external completion.
