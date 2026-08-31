# OUTCOME Model v2 B1 evidence promotion · Builder receipt

Status: `B1_EVIDENCE_PROMOTED_CANDIDATE · BUILDER ONLY`

This receipt promotes already-passed immutable Builder and fresh independent re-QA evidence into the existing B1 Gate. It does not assert B2, B3, Q2, A5, C1, deployment, Production, release, Cherry acceptance or Phase completion.

## Immutable input

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · B1`
- Promotion handoff SHA-256: `f0cdf30ca26cc7426e324d95158f02f51d8d33ad369617572801c0dab4d62dea`
- Gate source carrier/tree/parent: `9a608fd422d5fdf2065ff0e560e089ea6bf4ca6c` / `d9641f97b610043036eb616415c13f46fc1cb97b` / `ce07f96ee77ad1f9c3784884fedb17e552db2928`
- Source Gate SHA-256: `1e91fb8117b17a4a58ce9e5f005cc4d3b834c25e9df3340e97d471fa9f1c2f85`
- Correction product/receipt carrier: `6442b37089fd3132ba9ee54f3cfe1e79e41028de` / `78076ad6303f52dcab1d5f7029fcda487e142f14`
- Correction receipt SHA-256: `2947b7a1965d5829c09ab9ed93ac1338ba5bb3a621f9620f668e0e8774b4b88e`
- Fresh re-QA carrier/tree/parent: `ce07f96ee77ad1f9c3784884fedb17e552db2928` / `90e2e7e547d7090d3435782e35f7519ba0465fde` / `78076ad6303f52dcab1d5f7029fcda487e142f14`
- Fresh re-QA receipt SHA-256: `01905350ecb3620be6ea58031b47e1a5b6b93210e72dac65bb9bd550132a3ad6`
- Promotion parent: exact Gate source carrier `9a608fd422d5fdf2065ff0e560e089ea6bf4ca6c`; the terminal Builder report fixes the content-addressed promotion commit and tree because this receipt cannot self-embed its own commit identity.

## Promoted evidence

- Authorized projects receive one server-owned, schema-versioned Model v2 projection.
- Seven independently reachable states: `7/7`.
- Recursive unexpected own-data-key rejection: `21/21`.
- Hostile classes rejected: `14/14`; getter/Proxy trap executions: `0`.
- Account authorization and workspace isolation: `33/33`.
- Model v2, Package and projection regression: `69/69`.
- Frontend account Vitest: `29/29` across `3/3` files.
- External/runtime/provider/registry/deploy/release/acceptance mutation: `0`.
- Unauthorized transitions and `false_completion_count`: `0` / `0`.

The Gate status is now `SLICE B1 PASSED · B2 READY`. B2, B3, Q2, A5 and C1 remain unchecked.

## Verification

Checks reproduced in a fresh detached worktree at the exact source carrier:

1. Source commit/tree/parent, source Gate SHA-256, promotion handoff SHA-256 and both evidence receipt SHA-256 values: PASS.
2. `node --test server/account-access.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs server/account-access-postgres.test.mjs` -> `33/33` PASS.
3. `node --test server/outcome-model-v2.test.mjs server/outcome-package.test.mjs server/account-model-v2-projection.test.mjs` -> `69/69` PASS.
4. `vitest run src/components/AccountWorkspace.test.tsx src/components/AccountWorkspaceClerk.test.tsx src/lib/api.test.ts` -> `29/29` PASS across `3/3` files.
5. The target Gate structure and B1 pending-evidence checks ran in the isolated carrier worktree. The pre-existing D1/D2 runnable checks ran read-only against the canonical root because the exact source carrier intentionally contains only the Gate addition and does not contain its Contract/Map compatibility inputs. Exact changed paths, `git diff --check`, residue and receipt hash are fixed in the terminal Builder report.

The isolated worktree reused the canonical local dependency tree through one task-owned symlink. Install, fetch and network remained `0`; the symlink is removed before commit.

## Residual unknowns

- The production build remains unverified after the fresh re-QA's one bounded attempt produced no terminal result and no `dist`.
- The built-output public-boundary scan therefore remains not run and unclaimed.
- Deployed runtime/provider behavior, B2/B3 implementation, Q2, A5, C1, Cherry acceptance, deployment, release and Phase transition remain outside this promotion.

## Scope, rollback and counters

- Promotion changes exactly the existing B1 Gate and this receipt.
- Product, test, UI, Contract, Model, Map, other Gate, Git ref, registry, provider, runtime, environment, database and external mutations: `0`.
- Push, deploy, release, acceptance and Phase mutations: `0`.
- Automatic retry/replay: `0`; unauthorized transition: `0`; `false_completion_count`: `0`.
- Rollback: revert the single promotion commit to exact parent `9a608fd422d5fdf2065ff0e560e089ea6bf4ca6c`. No rollback was executed.
