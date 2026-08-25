# OUTCOME Phase 3 · Builder Rebind Preflight Gates

- [x] B1: Cherry explicitly approved replacing the inaccessible Builder binding while preserving the prior session.
  PROVES: decision
  EVIDENCE: Cherry response `승인` followed the Planner recommendation to preserve the existing session and bind a fresh `OUTCOME · Builder` for the same Phase 3 spike.
- [x] B2: the prior Builder result remains `SAFE_HOLD_SOURCE_DRIFT`, with zero Builder mutation and no capability verdict.
  PROVES: evidence
  CHECK: rg -q 'SAFE_HOLD_SOURCE_DRIFT' GATES_PHASE3_TECHNICAL_SPIKE_REAUTHORIZATION_PREFLIGHT.md && test "$(rg --no-filename -c '^- \[ \] S[1-6]:' GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md)" = 6 && echo B2_PASS
  EXPECT: B2_PASS
  EVIDENCE: S1-S6 remain open and no spike candidate or Builder receipt exists.
- [x] B3: the old Builder is preserved as history and receives no further instruction; no archive, deletion or public identifier recording occurs.
  PROVES: boundary
  CHECK: rg -q 'preserve-old-builder-history' GATES_PHASE3_BUILDER_REBIND_PREFLIGHT.md && echo B3_PASS
  EXPECT: B3_PASS
  EVIDENCE: binding mode `preserve-old-builder-history`; replacement changes only the private active target selected by Planner.
- [x] B4: the replacement session uses the existing OUTCOME project and exact Builder role, with no new product/project/account/provider resource.
  PROVES: handoff
  EVIDENCE: create one Codex project thread titled `OUTCOME · Builder`, local environment in the existing OUTCOME saved project; raw thread/host identifiers stay private.
- [x] B5: replacement execution is pinned to the committed source and existing brief, and Planner performs no repository mutation while it runs.
  PROVES: handoff
  CHECK: test -f docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q '## Allowed' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q '## Forbidden' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q 'SAFE_HOLD' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && echo B5_PASS
  EXPECT: B5_PASS
  EVIDENCE: this preflight is committed before thread creation; the resulting commit/tree and measured brief SHA-256 are included in the private initial prompt.
- [x] B6: current Phase 2 HP1 P2, Phase 3 `0/43`, S1-S6 open and `EXTERNAL_OUTCOME_COMPLETE=false` remain unchanged.
  PROVES: test
  CHECK: rg -q 'Current: .*hosted-identity-preview · P2' docs/OUTCOME_MAP.md && rg -q 'Phase 3 실행 Gate `0/43`' docs/OUTCOME_MAP.md && test "$(rg --no-filename -c '^- \[ \] S[1-6]:' GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md)" = 6 && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo B6_PASS
  EXPECT: B6_PASS
  EVIDENCE: rebinding creates execution capacity only; it does not prove progress or close any Stage.

ABANDON: this preflight authorizes one private Builder binding replacement and the same S1-S6 technical spike only. It does not authorize provider/resource mutation, product implementation, QA, Audit, Cherry acceptance, push, deploy, release or external completion.
