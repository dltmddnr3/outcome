# OUTCOME Session Binding Control Plane · Release Correction Gate V3

Scope: Correct fresh Release Re-Audit findings F1-F3 on parent `46e2531c0fbefedc6be5ce2f2243f5c60e46b16a` without live registry, assignment, provider, task, archive, deployment, QA, Audit, acceptance, or progress mutation.

- [x] V1: Registry create and atomic replacement produce exact regular non-symlink `0600`; every load and doctor reject all other owner/group/other modes and non-regular variants.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-package.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 60 persistence/Package tests passed. Create and replacement measure exactly 0600; 0000, 0100, 0200, 0300, 0400, 0500, 0700, 0640, 0604, 0644, and 0660 plus directory/dangling/non-dangling symlink inputs fail closed.

- [x] V2: Lock inspection uses no-follow directory-entry semantics; dangling/non-dangling symlinks and non-regular locks diagnose invalid, block mutation, and cannot be recovered or unlinked.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-session-control.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 18 persistence/control tests passed. `lstat`, exact-mode checks, `O_NOFOLLOW`, and descriptor inode matching classify three non-regular variants as `registry_lock_invalid`; recovery refuses them, mutation remains busy, and each original entry remains present.

- [x] V3: Sessions aliases use a bounded semantic grammar and reject provider/session/thread/task/turn identifier shapes across URI, underscore, equals, colon, UUID, and hyphen variants while preserving intended aliases.
  CHECK: `node --test server/outcome-package.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 47 Package tests passed. `planner-primary` and `outcome-local-private` remain valid; URI, UUID, credential/path, underscore/equal, and session/thread/task/turn/sess/provider/provider-name hyphen shapes fail closed.

- [x] V4: Targeted/full frontend and Node tests plus production build pass with zero regressions.
  CHECK: `npm test && npm run build`
  EXPECT: `/built in/`
  EVIDENCE: Targeted session-binding Node 82 passed; full frontend 90 passed across 5 files; full Node 232 passed; build transformed 1,652 modules in 737ms.

- [x] V5: Built/public redaction, prohibited-operation scan, exact path scope, and diff hygiene pass.
  CHECK: `git diff --check && ! rg -n 'process\.kill\s*\(' server/outcome-session-registry-persistence.mjs server/outcome-session-control.mjs`
  EXPECT: exit 0
  EVIDENCE: Built assets plus a 3,008-byte hostile public/doctor fixture produced 0 prohibited hits; persistence/control contained 0 `process.kill`, direct lock-path read, or follow-style lock existence hits; diff check passed; implementation changed exactly five authorized paths.

- [x] V6: The Builder receipt pins parent/candidate identity, measured evidence, rollback, open authority, false completion count, and learning receipt.
  CHECK: `rg -q 'false_completion_count' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V3_RECEIPT.md && rg -q 'learning_receipt' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V3_RECEIPT.md && rg -q 'Release Audit.*open' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V3_RECEIPT.md`
  EXPECT: exit 0
  EVIDENCE: `docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V3_RECEIPT.md` records exact identity, RED/GREEN evidence, rollback, and open Release Audit/Cherry boundaries.
