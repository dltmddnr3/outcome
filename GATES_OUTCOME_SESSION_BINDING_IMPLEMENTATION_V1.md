# OUTCOME Session Binding Control Plane · Builder Gate V1

Scope: Implement the first local-only session-binding slice at parent `46276746dc4f2c311ed8c857e854050a408095ac` without provider, hosted runtime, release, QA, Audit, or acceptance mutation.

- [x] G1: Optional Package `sessions_file` projects four ordered role slots and a missing companion remains valid as `setup_required`.
  CHECK: `node --test server/outcome-package.test.mjs`
  EXPECT: `/pass [1-9][0-9]*/`
  EVIDENCE: `server/outcome-package.test.mjs` passed 44/44 in the full Node run, including missing companion, installer, traversal, and corrupt-registry projections.

- [x] G2: Persistent private v2 registry enforces one active binding, CAS, append-only atomic state/events, restart recovery, legacy stale migration, and fail-closed corrupt/concurrent writes.
  CHECK: `node --test server/phase3-private-session-registry.test.mjs server/outcome-session-registry-persistence.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: targeted Node run passed 70/70 across package, legacy registry, persistent registry, and control tests; persistent tests cover restart, stale CAS loser, partial/temp recovery, duplicate active, history gap, and stale migration.

- [x] G3: Local doctor/assign/replace/revoke/observe/checkpoint controls redact locators, and Planner replacement requires freeze, verified handoff, STARTED, and CONTINUITY_READY.
  CHECK: `node --test server/outcome-session-control.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: `server/outcome-session-control.test.mjs` passed 4/4; locator argv was rejected, stdin locator was absent from serialized output, and each missing Planner prerequisite failed closed.

- [x] G4: Runtime public projection and dashboard render all four roles with state, version, history, stage, and expandable history detail without raw identifiers.
  CHECK: `npx vitest run src/components/OutcomeDashboard.test.ts`
  EXPECT: `/passed/`
  EVIDENCE: targeted dashboard suite passed 59/59; the role disclosure includes version, history count, Stage placement, and append-only event detail with no raw identifier field.

- [x] G5: The OUTCOME Package template and current manifest declare four unassigned slots without invented assignment.
  CHECK: `for f in templates/OUTCOME_SESSIONS.md docs/OUTCOME_SESSIONS.md; do for role in planner builder ux_product_qa release_audit; do rg -q "^  ${role}:" "$f" || exit 1; done; rg -q 'active_binding_ref: null' "$f" || exit 1; done`
  EXPECT: exit 0
  EVIDENCE: `templates/OUTCOME_SESSIONS.md` and `docs/OUTCOME_SESSIONS.md` each contain all four role keys and four null active binding references.

- [x] G6: Targeted and full Node/frontend suites plus production build pass.
  CHECK: `npm test && npm run build`
  EXPECT: `/built in/`
  EVIDENCE: full Vitest passed 90/90; full Node passed 220/220; production build transformed 1652 modules and emitted the Vite bundle in 751ms.

- [x] G7: Changed files are clean, bounded, and built/API fixtures contain zero prohibited raw locator or provider identifier fields.
  CHECK: `git diff --check && { git diff --name-only 46276746dc4f2c311ed8c857e854050a408095ac..HEAD; git diff --cached --name-only; } | sort -u | { ! rg -v '^(server/(outcome-package|phase3-private-session-registry|outcome-session-[^/]+)\.(mjs|test\.mjs)|src/components/(OutcomeDashboard\.tsx|OutcomeDashboard\.test\.ts|outcomeKorean\.ts)|src/styles\.css|config/outcome-projects\.json|templates/OUTCOME_SESSIONS\.md|docs/OUTCOME_SESSIONS\.md|GATES_OUTCOME_SESSION_BINDING_IMPLEMENTATION_V1\.md|docs/OUTCOME_SESSION_BINDING_IMPLEMENTATION_V1_RECEIPT\.md|package\.json)$'; } && ! rg -n 'locator_ref|provider_locator|session_id|thread_id|task_id|turn_id' dist && node --input-type=module -e "import { collectOutcomePackages, projectPublicPackages, loadBindingRegistry } from './server/outcome-package.mjs'; process.stdout.write(JSON.stringify(projectPublicPackages(collectOutcomePackages({ bindingRegistry: loadBindingRegistry(), now: new Date('2026-08-27T00:00:00.000Z') }))))" > /tmp/outcome-session-public.json && ! rg -n 'locator_ref|provider_locator|session_id|thread_id|task_id|turn_id' /tmp/outcome-session-public.json`
  EXPECT: exit 0
  EVIDENCE: implementation commit contains 13 authorized paths; `git diff --check` passed; built assets and a 95,719-byte public dashboard fixture produced 0 prohibited hits.

- [x] G8: Builder receipt records exact candidate identity, measured verification, migration/redaction behavior, rollback, open work, false completion count, and learning receipt while keeping QA/Audit/acceptance open.
  CHECK: `rg -q 'false_completion_count' docs/OUTCOME_SESSION_BINDING_IMPLEMENTATION_V1_RECEIPT.md && rg -q 'learning_receipt' docs/OUTCOME_SESSION_BINDING_IMPLEMENTATION_V1_RECEIPT.md && rg -q 'QA.*open' docs/OUTCOME_SESSION_BINDING_IMPLEMENTATION_V1_RECEIPT.md`
  EXPECT: exit 0
  EVIDENCE: `docs/OUTCOME_SESSION_BINDING_IMPLEMENTATION_V1_RECEIPT.md` records the implementation candidate, measurements, rollback, explicit open authority boundaries, `false_completion_count`, and `learning_receipt`.
