# Phase 3 Observer Bridge · Supabase Project Provisioning Receipt

## Terminal

BLOCKED_SUPABASE_FREE_PROJECT_QUOTA

No Supabase project was verified as created. This receipt is a fail-closed provisioning-attempt record, not a project, hosted-code, deployment, acceptance, or release receipt.

## Authority and source

- audited baseline commit: 2156bd80de5645d355ae8b627d98a46a2b184c4e
- audited baseline tree: 1a69dda58f0a26d3236aaf8fcd1d24d633e47e67
- approved public alias: OUTCOME_SUPABASE_PREVIEW
- approved project display name: OUTCOME
- approved region: ap-northeast-2
- organization display-name matches: 1
- source drift: 0

Private organization and confirmation values were used only inside the provider control call and were not written to argv, repository files, or public output.

## Measured preflight

- preflight project matches: 0
- pre-create project matches: 0
- cost: amount 0; recurrence monthly
- cost approval: exact Cherry approval matched before private confirmation
- plan: Free
- existing active projects: 2

The live Free organization already contained two active projects. The approved create call returned without a verifiable target project; ten subsequent read-only list observations over the bounded reconciliation window continued to report zero case-insensitive OUTCOME matches. No retry was made.

## External operation ledger

- create call: 1
- verified project creates: 0
- create retries: 0
- existing project mutations: 0
- delete/pause/upgrade/migration: 0
- keys/credentials/environment/schema/runtime: 0
- branch, table, role, policy, function, extension, auth, storage, realtime, deploy, push, release mutations: 0

The create result was not promoted to success because read-only reconciliation found no target. The current blocker is BLOCKED_SUPABASE_FREE_PROJECT_QUOTA.

## Next authority boundary

- next decision: organization plan upgrade
- Builder authority to upgrade: none
- alternate organization provisioning: unauthorized
- existing project pause or deletion: unauthorized
- another create attempt: unauthorized until a new Cherry decision and fresh duplicate/cost preflight

Rollback requires no mutation because verified project creates are zero. If a delayed project ever becomes visible, stop and reconcile read-only before any new create; deletion remains destructive and requires separate Cherry approval.

## Locked state

- O2: OPEN/LOCKED
- Phase 3: 17/43
- migration, hosted wiring, Cherry acceptance, deploy, release: OPEN
- EXTERNAL_OUTCOME_COMPLETE=false

This receipt changes no Contract, Map, progress, migration, code, tests, runtime, provider configuration, or release state.

## Privacy and false-completion controls

- raw provider identifiers: 0
- endpoints, keys, credentials, emails, confirmation values: 0
- false completion prevented: project call was not treated as project creation
- false completion prevented: zero list matches was not described as eventual success
- false completion prevented: cost approval was not treated as quota approval
- false completion prevented: a blocked provisioning attempt was not promoted to O2, Phase 3 progress, hosted readiness, acceptance, deployment, release, or external completion

## Rollback

Revert the local documentation carrier commit. There is no verified project to pause or delete. Do not perform a destructive provider rollback without separate Cherry approval.

## Learning receipt

Cost confirmation and create authorization do not override organization quota. A provider call is not durable success until the target is independently visible through read-only reconciliation; after an unverified call, retry remains zero.
