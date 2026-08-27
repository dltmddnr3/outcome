# OUTCOME Session Binding Control Plane · QA Correction Gate V1

Scope: Correct fresh QA findings F1 and F2 on parent `c8e35e88aed88a5f622c9a011f83b6482de6823f` without live registry, provider, deployment, QA, Audit, acceptance, or progress mutation.

- [x] C1: Persisted v2 binding and event public metadata is strictly schema-validated on load, including public string safety and unknown-key rejection.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 7 persistence tests passed with 0 failures, including a 112-case hostile public-metadata matrix and binding/event unknown-key rejection.

- [x] C2: Public projection uses an explicit allowlist plus defensive sanitization, and adversarial locator, credential, path, UUID, session, thread, task, and turn values produce zero raw public bytes.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-package.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: 53 tests passed with 0 failures. The exact QA `codex://tenant-alpha/private-conversation/short` probe fails the registry closed and is absent from the public Package bytes.

- [x] C3: The interactive role-history `summary` target has a minimum height of at least 44px at desktop and responsive breakpoints while retaining focus visibility.
  CHECK: `node --test server/outcome-package.test.mjs && npx vitest run src/components/OutcomeDashboard.test.ts`
  EXPECT: `/fail 0/` and `/59 passed/`
  EVIDENCE: The CSS-source regression binds 44px and focus-visible assertions to the actual `summary` target and rejects responsive overrides below 44px; 46 Node and 59 dashboard tests passed.

- [x] C4: Targeted and full frontend/Node suites plus production build pass.
  CHECK: `npm test && npm run build`
  EXPECT: `/built in/`
  EVIDENCE: Full frontend 90 passed across 5 files; full Node 224 passed; build transformed 1,652 modules and passed in 722ms.

- [x] C5: Correction paths are bounded, diff checks pass, and hostile public projection plus built assets have zero prohibited values or identifier fields.
  CHECK: `git diff --check && ! rg -n -i 'codex://tenant-alpha/private-conversation/short|token=private-value|/Users/cherry/private-registry|123e4567-e89b-12d3-a456-426614174000|session_id=private-value|thread_private_value|task_private_value|turn_private_value|locator_ref|provider_locator|session_id|thread_id|task_id|turn_id' dist /tmp/outcome-session-correction-public.json`
  EXPECT: exit 0
  EVIDENCE: Diff check passed; the 95,704-byte hostile public fixture and built assets produced 0 hits. Implementation commit changes exactly four authorized paths.

- [x] C6: The correction receipt records exact parent/candidate identity, measured verification, rollback, open QA/Audit/acceptance, false completion count, and learning receipt.
  CHECK: `rg -q 'false_completion_count' docs/OUTCOME_SESSION_BINDING_QA_CORRECTION_V1_RECEIPT.md && rg -q 'learning_receipt' docs/OUTCOME_SESSION_BINDING_QA_CORRECTION_V1_RECEIPT.md && rg -q 'QA.*open' docs/OUTCOME_SESSION_BINDING_QA_CORRECTION_V1_RECEIPT.md`
  EXPECT: exit 0
  EVIDENCE: `docs/OUTCOME_SESSION_BINDING_QA_CORRECTION_V1_RECEIPT.md` records the immutable correction candidate and preserves all downstream authority boundaries.
