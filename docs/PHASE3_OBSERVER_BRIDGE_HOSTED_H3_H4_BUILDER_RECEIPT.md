# Phase 3 Observer Bridge H3-H4 Option A Correction Builder Receipt

Status: `HOSTED_CODE_CANDIDATE_READY_ONLY`

## Immutable boundary

- Planner authorization: commit `515c829e1bc2857535d405effbae0edacd0b6de0`, tree `ae741ba4c467931caa085d1b4b00522cfd814328`.
- Authorization parent / fresh QA carrier: commit `7ab8c7619872b03ebc16dafe2449dc75a7f3edb7`, tree `5f622360878ca15865d8ac871966b5fa508cd67e`.
- Failed candidate under correction: commit `b0aef3a1af681c554d7c898e0e1d44a54466a456`, tree `04ba7320c7b9eb09f232f3f38d2f3aa5c50eb3dc`.
- Authorization file SHA-256 pins: amendment `429caf34d54277eb090cb70bac2c69f341b18b19ad2197e771355a4260fac055`; correction brief `3ac58a3651c5298054b27a9bc725c8ae55f653915c9ac08cdbd9cfeaf74eb701`; Gate `d91b9248947aece60468a5556035c1dd14199a2677fdffceb2fa3179c23f642f`.
- The exact authorization commit was checked out in an isolated worktree before mutation. Object/hash drift: 0. Scope drift: 0.
- Semantic correction candidate: commit `99697927dbdd19269fb0f83ce603d36948bdb6b2`, tree `7d0adb6fef6be891240a836087db5fc0a2189d08`, parent `515c829e1bc2857535d405effbae0edacd0b6de0`.
- Exact migration SHA-256: `300cb7222329ff6b15daea10752f195748c8a593cd0290f7784c98fc95dd3953`.

## RED-first correction evidence

Before the implementation correction, the focused adversarial command was:

```text
node --test --test-name-pattern='Option A|restore rejects caller assertion|event and audit identity|tombstone purges source|future skew below' server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs
tests 5; pass 0; fail 5; duration 1350.178ms
```

The five failures reproduced mutable GUC authority/two-role substitution, caller-asserted restore, sequential event/audit identity, unbounded future projection, and retained raw source/certificate residue. The identical focused domains then passed as part of the 23/23 GREEN run.

## F2-F6 correction evidence

- F2: mutable GUC substitution went RED -> GREEN. The migration declares exactly one `outcome_bridge_backend` role with `NOLOGIN` and `NOBYPASSRLS`. Every adapter transaction supplies the frozen effective role and the actual PGlite transaction executes `SET LOCAL ROLE outcome_bridge_backend` under forced RLS.
- The successful effective-role operation matrix is 7/7 paths: activate, append, rotate, revoke, tombstone, manifest, restore. Mixed workspace/project/role/binding/source/key selectors and an unrelated schema are denied. `anon` has no bridge grants; `authenticated` has only owner-filtered projection `SELECT`.
- F3: the stored manifest is immutable and versioned; it binds schema version, durable revision, exact tombstone count and tombstone coverage digest. Restore requires its matching immutable receipt and transactionally re-applies every tombstone. Missing, conflicting, stale, incomplete, inaccessible evidence fails closed.
- F4: event and audit row identities are opaque random UUIDv7-shaped values. Failed transactions publish zero rows and consume no ledger revision. Ordering belongs only to ledger revision and event sequence; no identity contiguity claim is made.
- F5: a finite 5000 ms future-skew boundary is shared by the operations and Postgres adapters. Below/at/above cases execute; above-boundary evidence cannot publish projection, NOW, or progress.
- F6: tombstone deletes raw source rows and public-key/certificate-bearing source-key rows. Restore re-applies tombstone coverage; exact raw resurrection count is 0. Only a one-way deletion receipt digest remains.
- Catalog execution measured by the migration test: 11/11 bridge tables have RLS enabled and forced, 12 explicit policies exist, exactly one bridge backend role exists, and event update plus manifest/audit update/delete remain ungranted.
- Static prohibited authority scan for `service_role`, `SECURITY DEFINER`, `auth.role()`, and bridge custom `current_setting(...)`: 0 hits. Credential/token/password scan across the five semantic paths: 0 hits.

## GREEN and proportional regression

| Command | Measured result |
|---|---|
| focused Postgres + operations tests | 23/23 PASS; 5533.683 ms |
| observer bridge/account focused set | 69/69 PASS; 5995.653 ms |
| `npm run test:package-model` | 39/39 PASS |
| `npm run check:mutations` | 32/32 local mutations exact 405; 28/28 API `read_only`; page-body boundary 0/4 |
| `npm run test:security` | 29/29 PASS; prohibited disclosure 0; Gate evidence 0; client env leak 0/6 |
| `npm test` | frontend 89/89 + Node 212/212 = 301/301 PASS |
| `node --test scripts/*.test.mjs server/*.test.mjs` | 240/240 PASS; 6249.332 ms |
| `npm run build` | PASS; 1652 modules transformed |
| `npm run check:scope` | PASS; 45 approved product/runtime/test files |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

The executable checks use a local PostgreSQL-compatible PGlite engine to apply the exact foundation and observer migration, enter the declared effective role, and exercise forced RLS. No remote database was contacted.

## Changed paths

- `supabase/migrations/20260827000756_observer_bridge.sql`
- `server/phase3-observer-bridge-postgres.mjs`
- `server/phase3-observer-bridge-postgres.test.mjs`
- `server/phase3-observer-bridge-operations.mjs`
- `server/phase3-observer-bridge-operations.test.mjs`
- `GATES_PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_CORRECTION.md`
- `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md`

## Rollback, residual risk, and open boundaries

- Rollback before any external wiring is Git-only: revert the receipt carrier, then revert semantic correction commit `99697927dbdd19269fb0f83ce603d36948bdb6b2`. No external state needs compensation.
- Accepted residual risk: a full compromise of the trusted backend process or its effective-role credential defeats isolation among bridge rows. Option A provides a server-only trust boundary, not containment after total backend compromise.
- PGlite is PostgreSQL-compatible executable evidence, but managed Supabase parity and hosted wiring remain unproven. The feature remains disabled by default and locally unwired.
- Fresh UX & Product QA and fresh Release Audit remain required. This Builder did not self-QA, self-audit, or accept the candidate.
- O2 remains `OPEN/LOCKED`; Phase 3 remains `17/43`; `EXTERNAL_OUTCOME_COMPLETE=false`. Contract, Map, progress, Cherry acceptance, deploy, release, and public messaging were not changed.
- External mutation ledger: remote DB 0, Supabase/provider/account/project 0, credential/env 0, network 0, browser/device/session 0, deploy/push/release/public message 0. Total external operations: 0.

## False-completion and learning receipt

`false_completion_count: 5`

1. Local migration execution is not a hosted migration.
2. Builder GREEN is not independent QA.
3. Independent QA is not Release Audit.
4. A release audit would not close O2 or authorize deployment/release.
5. A dedicated backend role does not preserve row isolation after full backend process or credential compromise.

`learning_receipt:` authorization must be attached to an effective database role, not mutable session text; recovery proof must be stored and content-bound before restore; opaque row identity and ledger ordering are separate concerns; retention is incomplete until reconstructive residue and resurrection are both tested.
