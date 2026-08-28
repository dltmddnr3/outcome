# Phase 3 Observer Bridge · Trusted Runtime Boundary Amendment Gates

Outcome: Observer Bridge hosted handoff separates remotely controlled HTTP data from trusted in-process runtime objects, preserving strict byte validation without treating a compromised Node/Vercel process as a remotely reachable input class.

- [x] T1: Exact QA FAIL carrier, tree, parent, and report hash are pinned.
  CHECK: test "$(git show -s --format=%H e02b28a277bb3837337f08e011513685690eba82)" = "e02b28a277bb3837337f08e011513685690eba82" && test "$(git show -s --format=%T e02b28a277bb3837337f08e011513685690eba82)" = "fff341cc56811d63a007df8f990b81a4bf70900e" && test "$(git show -s --format=%P e02b28a277bb3837337f08e011513685690eba82)" = "36fd268a0d29faa9bf954a6693d9158ef167779c" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_FRESH_QA_36FD268.md | awk '{print $1}')" = "77c1607df3066bfdccd8b20b902996c3fd5f2cec42506a2bc42e4a74077281ff" && echo T1_PASS
  EXPECT: exact reviewed evidence graph with byte-identical QA FAIL report.
  EVIDENCE: command returned T1_PASS against carrier e02b28a, tree fff341c, parent 36fd268, and report SHA-256 77c1607d.

- [x] T2: The amendment explicitly classifies remote hostile data and trusted runtime surfaces.
  CHECK: rg -q '^## Remotely hostile input' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q '^## Trusted in-process surface' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'Node/Vercel request object' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && echo T2_PASS
  EXPECT: two non-overlapping threat classes are explicit.
  EVIDENCE: command returned T2_PASS; the amendment has separate remotely hostile and trusted in-process sections.

- [x] T3: Reachable HTTP acceptance remains fail-closed and measurable.
  CHECK: rg -q 'raw URL bytes' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'primitive string or genuine Buffer' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'one invocation, zero automatic retry' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'no-store' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && echo T3_PASS
  EXPECT: external bytes, auth, body, retry, error, and cache boundaries remain strict.
  EVIDENCE: command returned T3_PASS for raw bytes, exact chunk types, one-call/no-retry, and private no-store requirements.

- [x] T4: In-process compromise is recorded as accepted residual risk, not silently treated as PASS.
  CHECK: rg -q 'full trusted runtime or backend-process compromise' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'best-effort finite 503' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'trap-count zero is not a release claim' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && echo T4_PASS
  EXPECT: no false isolation claim after trusted-process compromise.
  EVIDENCE: command returned T4_PASS; full backend compromise remains an explicit residual risk and trap-count zero is not promoted.

- [x] T5: The next Builder correction is minimal and removes brittle speculative guards.
  CHECK: rg -q 'function name' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'Promise constructor' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'generic object coercion' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'No new dependency' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && echo T5_PASS
  EXPECT: correction scope is simpler than the failed candidate and directly traceable to reachable inputs.
  EVIDENCE: command returned T5_PASS; function-name, Promise-constructor, and generic coercion guards are explicitly excluded.

- [x] T6: Supabase, hosted activation, progress, and release authority remain locked.
  CHECK: rg -q 'Supabase project.*OPEN' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'O2.*OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'Phase 3.*17/43' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md && echo T6_PASS
  EXPECT: documentation amendment grants no external or completion authority.
  EVIDENCE: command returned T6_PASS; Supabase remains open, O2 locked, Phase 3 17/43 unchanged, and external completion false.

## ABANDON

**ABANDON:** This amendment defines the reviewable threat boundary and next local Builder scope only. It is not product implementation, QA, Release Audit, Supabase parity, hosted activation, deployment, Cherry acceptance, O2 evidence, progress, release, or external completion.
