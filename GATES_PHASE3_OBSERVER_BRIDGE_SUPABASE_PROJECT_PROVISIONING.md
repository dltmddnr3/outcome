# Phase 3 Observer Bridge · Supabase Project Provisioning Gate

Outcome: Cherry가 승인한 전용 빈 project 생성을 시도하되 중복·비용·quota 경계에서 fail closed하고, 성공하지 않은 provisioning을 완료로 승격하지 않는다.

- [x] P1: audited local source pin이 정확하다.
  CHECK: test "$(git show -s --format=%H 2156bd80de5645d355ae8b627d98a46a2b184c4e)" = "2156bd80de5645d355ae8b627d98a46a2b184c4e" && test "$(git show -s --format=%T 2156bd80de5645d355ae8b627d98a46a2b184c4e)" = "1a69dda58f0a26d3236aaf8fcd1d24d633e47e67" && echo P1_PASS
  EXPECT: source drift 0.
  EVIDENCE: isolated worktree was created from the audited local branch pin.
- [x] P2: preflight authority, uniqueness, and live cost matched Cherry approval before create.
  CHECK: rg -q 'organization display-name matches: 1' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'preflight project matches: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'pre-create project matches: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'cost: amount 0; recurrence monthly' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && echo P2_PASS
  EXPECT: exact Dock match 1, duplicate 0, approved cost exact.
  EVIDENCE: fresh read-only lists and live cost query passed; approval confirmation stayed private.
- [x] P3: create was called once, never retried, and no project creation is claimed without read-only reconciliation.
  CHECK: rg -q 'create call: 1' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'verified project creates: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'create retries: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && echo P3_PASS
  EXPECT: uncertain/failed create is never retried or promoted.
  EVIDENCE: ten post-call read-only list observations found zero case-insensitive target matches.
- [x] P4: blocker is the Free-plan active-project quota and the next decision is outside Builder authority.
  CHECK: rg -q 'plan: Free' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'existing active projects: 2' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'BLOCKED_SUPABASE_FREE_PROJECT_QUOTA' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'next decision: organization plan upgrade' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && echo P4_PASS
  EXPECT: Builder performs no upgrade, pause, delete, or alternate-org provisioning.
  EVIDENCE: read-only organization/project state matches the documented two-active-project Free quota.
- [x] P5: external mutation ledger records zero verified project creation and zero unrelated mutations.
  CHECK: rg -q 'existing project mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'delete/pause/upgrade/migration: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'keys/credentials/environment/schema/runtime: 0' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && echo P5_PASS
  EXPECT: no scope expansion.
  EVIDENCE: only the approved create call was attempted; all other mutation classes are zero.
- [x] P6: tracked evidence contains no provider identifiers, endpoint, key, credential, email, or confirmation value.
  CHECK: ! rg -n -i '(https?://|postgres(ql)?://|supabase\.co|sb_(publishable|secret)_|service[_ -]?role|anon[_ -]?key|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|@[[:alnum:]._-]+\.[[:alpha:]]{2,})' GATES_PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING.md docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && echo P6_PASS
  EXPECT: prohibited public hits 0.
  EVIDENCE: only approved display names, region, aggregate counts, and opaque public alias are recorded.
- [x] P7: product and release boundaries remain locked.
  CHECK: rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && rg -q 'migration, hosted wiring, Cherry acceptance, deploy, release: OPEN' docs/PHASE3_OBSERVER_BRIDGE_SUPABASE_PROJECT_PROVISIONING_RECEIPT.md && echo P7_PASS
  EXPECT: blocker receipt changes no product progress or release state.
  EVIDENCE: receipt explicitly preserves every locked boundary.

## ABANDON

**ABANDON:** 이 Gate는 project provision 성공을 증명하지 않는다. 별도 Cherry 결정 없이는 plan upgrade, 기존 project pause/delete, 재시도, migration, hosted wiring, deploy 또는 release를 수행하지 않는다.
