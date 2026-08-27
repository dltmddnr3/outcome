# OUTCOME Session Binding Control Plane · Release Correction Gate V2

Scope: Correct Release Audit findings F1-F4 on parent `31285f40b8082183c861c9a76538cd32521c0e9d` without live registry, provider, task, archive, deployment, QA, Audit, acceptance, or progress mutation.

- [x] R1: Restart validation folds append-only events into binding lifecycle truth and rejects action, status, predecessor/successor, and terminal timestamp mismatches.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 11 persistence tests passed with 0 failures. Adversarial fixtures reject first-event replace, missing revoke event, fabricated replaced state, self-predecessor, observation/status drift, version gaps, and terminal timestamp mismatches.

- [x] R2: Every v2 registry load and doctor rejects group/other permission bits, while registry creation and atomic replacement remain mode `0600`.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-package.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 58 persistence and Package tests passed. Modes 0640, 0604, and 0644 fail load as `registry_unavailable`; doctor returns `registry_permissions_too_open`; create and post-mutation files measure 0600.

- [x] R3: Writer locks carry bounded owner identity, live locks remain protected, stale orphan locks are diagnosed and recoverable without signaling or killing a process, and operator recovery is documented.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-session-control.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 16 persistence/control tests passed. Atomic hard-link acquisition leaves only a complete 0600 lock; live, young/unconfirmed, wrong-owner, wrong-ref, and old orphan cases are distinguished; only exact-ref orphan recovery succeeds; source contains no `process.kill`; the contract records the six-step operator flow.

- [x] R4: Sessions manifests accept only exact public schema keys and safe aliases, rejecting raw locator/provider identifiers, credentials, paths, UUIDs, and secret-bearing fields.
  CHECK: `node --test server/outcome-package.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 47 Package tests passed. `planner-primary` is accepted; URI locator, session/thread/task/turn IDs, UUID, absolute path, token, common credential prefixes, and unknown/secret-bearing fields fail closed.

- [x] R5: Targeted/full frontend and Node tests, production build, redaction, path-scope, and diff hygiene pass.
  CHECK: `npm test && npm run build && git diff --check`
  EXPECT: `/built in/`
  EVIDENCE: Targeted session-binding Node 80 passed; full frontend 90 passed across 5 files; full Node 230 passed; build transformed 1,652 modules in 742ms; diff check passed; built assets plus a 3,007-byte hostile public/doctor fixture had 0 prohibited hits.

- [x] R6: The Builder receipt pins candidate identity, measured evidence, rollback, open authority, false completion count, and learning receipt.
  CHECK: `rg -q 'false_completion_count' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V2_RECEIPT.md && rg -q 'learning_receipt' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V2_RECEIPT.md && rg -q 'Release Audit.*open' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V2_RECEIPT.md`
  EXPECT: exit 0
  EVIDENCE: `docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V2_RECEIPT.md` records exact parent/candidate identity, bounded paths, measured verification, rollback, and open Release Audit/Cherry authority.
