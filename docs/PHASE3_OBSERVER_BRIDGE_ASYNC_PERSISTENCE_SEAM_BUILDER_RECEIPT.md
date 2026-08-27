# Phase 3 Observer Bridge · Async Persistence Seam Builder Receipt

Terminal: **BUILDER_ASYNC_SEAM_CANDIDATE_READY_ONLY**

## Immutable source and candidate

- source Release Audit carrier: `f9e441cb20b78d32136b60cbe2a3f522fd9aac73`
- source tree: `9544fca8b8a381574d6affa647e17eb7c8710eec`
- source parent: `6b93799b95d5bda87ac028d83b9fadcc44494a83`
- source Release Audit report SHA-256: `81625d492f583ce5876c5712f7d0ebc7424cfaf897d0245191f6511bf4b30240`
- semantic candidate: `84d56664bad5e565f5320e3a0c80ed1f4d45f7f4`
- semantic tree: `479d69eda14e46b16bc1e4219c3cb1942bfec19b`
- semantic parent: exact source carrier above
- isolated branch: `codex/phase3-observer-bridge-async-seam`
- source drift: 0

Changed paths, exactly six:

- `server/phase3-observer-bridge-api.mjs`
- `server/phase3-observer-bridge-api.test.mjs`
- `api/index.mjs`
- `server/stable-host.test.mjs`
- `GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM.md`
- `docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md`

## Implemented boundary

- `handleHostedObserverBridgeRequest` is Promise-based and awaits each of the six exact bridge operation paths inside its existing `try`/finite-error boundary.
- Synchronous return/throw and asynchronous resolve/reject produce the same response contract. Unknown failures become `503 {error:"bridge_unavailable"}`; known `HostedObserverBridgeError` codes retain their existing finite mappings.
- Each request invokes its selected bridge method exactly once. Rejection has retry 0. This slice adds no timeout or cancellation policy.
- The stable-host caller explicitly awaits the API Promise. Repository call-site inventory found only the implementation, this awaited stable-host caller, and the API test harness, whose calls are awaited.
- Raw request path/body, byte cap, duplicate and forbidden JSON key checks, owner CSRF, server-derived auth context, companion ambient-auth removal, exact path/method allowlist, default-disabled runtime construction, and private no-store behavior are unchanged.
- No driver, connection, client package, environment value, persistence resource, or hosted activation was added.

## RED / GREEN evidence

RED before product edit:

```text
node --test --test-name-pattern='RED async' server/phase3-observer-bridge-api.test.mjs
tests 2; pass 0; fail 2
async resolve escaped as a Promise-valued 200 body; async reject escaped as a rejected Promise-valued 200 body.
```

GREEN focused:

```text
node --test --test-name-pattern='sync and async bridge methods' server/phase3-observer-bridge-api.test.mjs
1/1 PASS; six endpoints x sync/async = 12 exact success responses.

node --test --test-name-pattern='sync throws and async rejections' server/phase3-observer-bridge-api.test.mjs
1/1 PASS; six endpoints x four failure classes = 24 finite mappings.

node --test --test-name-pattern='one invocation|unhandled rejection|thenable' server/phase3-observer-bridge-api.test.mjs
2/2 PASS; invocation count 1, retry 0, unhandledRejection 0, hostile thenable fails closed.

node --test server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
33/33 PASS.
```

The pre-existing raw-route adversarial matrix remains active: 15 direct dot/encoded-separator/backslash/control/invalid-percent aliases plus raw request-target and Vercel catch-all mapping checks fail before authentication or bridge selection. Canonical query parsing remains valid.

## Regression evidence

- audited bridge/account targeted matrix: PASS, 115/115
- full Node: PASS, 236/236
- full frontend: PASS, 89/89 across 5 files
- build: PASS, TypeScript plus Vite, 1,652 modules
- security: PASS, 40/40; stable snapshot prohibited disclosures 0; client environment boundary leaks 0
- public: PASS, 4/4
- mutation matrix: PASS, local 32/32 exact 405; API `read_only` JSON 28/28; page boundary 0/4
- scope: PASS, 47 product/runtime/test files; unapproved dependency hits 0
- runbook: PASS
- public boundary: PASS, prohibited identifiers 0
- call-site inventory: PASS, 3 files and no unawaited caller
- `git diff --check`: PASS
- Gate checker: recorded by the final carrier after all Gate evidence is fixed

security/public/mutation/scope/runbook/boundary/diff: PASS

## External mutation ledger and locked state

- external mutations: 0
- Supabase/provider/account/project/billing/database/migration/credential/env/network/browser/session operations: 0
- deploy/push/release/public message: 0
- database connections: 0
- persistence retries: 0
- O2: OPEN/LOCKED
- Phase 3: 17/43
- EXTERNAL_OUTCOME_COMPLETE=false

## Rollback

Revert the receipt carrier first, then revert semantic candidate `84d56664bad5e565f5320e3a0c80ed1f4d45f7f4`. This restores the audited synchronous local API behavior from source `f9e441cb20b78d32136b60cbe2a3f522fd9aac73`. No external rollback is required because the external mutation ledger is zero.

## Accepted residual risk

- No timeout, cancellation, uncertain-completion reconciliation, database driver, transaction pooler configuration, or live persistence behavior is implemented or claimed.
- A future hosted adapter must define those policies under separate authority and fresh QA/Audit. The production bridge factory remains absent and both bridge flags remain false.

## False completion controls

false_completion_count: 7

1. Async-compatible code is not a database connection.
2. Focused and full test PASS is Builder evidence, not independent QA.
3. The prior runtime Release Audit does not audit this new candidate.
4. Default-disabled construction is not hosted activation.
5. No timeout policy is not evidence of timeout safety.
6. O2 and Phase 3 progress remain unchanged and locked.
7. Local commits are not deploy, release, Cherry acceptance, or external completion.

## Learning receipt

learning_receipt: When a synchronous HTTP adapter is extended for asynchronous persistence, awaiting at the existing operation/error boundary is the smallest safe change: it preserves parser and authorization ordering, assimilates Promise and hostile thenable failures into one finite mapping, and makes one-call/no-retry behavior directly testable without inventing transport policy.
