# OUTCOME Builder O2 Preview admin route correction

Status: `PREVIEW_ADMIN_ROUTE_CORRECTION_CANDIDATE_READY_FOR_FRESH_QA`

## Immutable input

- Base candidate/tree/parent: `4e51a25c3883855f88722245bf38c1d2c92981b6` / `5ac85b7c0871967cc6674bd4afa365dfdfda4f3c` / `308e2c7c8d7fc53a8feadef8481e3b0c8517978f`.
- Handoff SHA-256: `efa0d593cdbd5c46dcf8270f83599674b320f5724d606722d639097d439e59a6`.
- Corrected predecessor receipt SHA-256: `d93254273c79efeaaa84976d9830694835e507adedf45059e1859fd35275aa84`.
- Candidate identity is the enclosing Git commit; fresh QA must independently pin its commit/tree/parent before validation.

## Changed scope

- `api/index.mjs`
- `server/phase3-observer-bridge-api.mjs`
- `server/phase3-observer-bridge-api.test.mjs`
- `server/phase3-observer-bridge-managed-runtime.mjs`
- `server/phase3-observer-bridge-managed-runtime.test.mjs`
- `server/stable-host.test.mjs`
- this receipt

Exactly four private Preview admin routes are exposed: viewer register, viewer revoke, expired-challenge cleanup and readiness. The stable host passes only the managed runtime's admin surface to the admin handler. POST operations require exact JSON, immutable Preview Origin and server CSRF; readiness is authenticated GET. Every operation receives a server-extracted session token and the managed runtime freshly resolves owner/project authority. Cleanup no longer accepts a caller workspace and derives its only workspace from the authorized owner context.

## RED before GREEN

- Base RED: the direct API test could not import an admin handler because no admin route export existed.
- Base RED: managed cleanup accepted workspace/before/limit without token or project authority.
- Dependency isolation: the isolated checkout initially lacked its dependency tree. Lockfile-preserving `npm ci --ignore-scripts --no-audit --no-fund` used a task-owned cache; manifests and lockfile remained unchanged and the ignored dependency tree is terminal-cleanup owned.

## Verification

- Targeted hostile matrix: `76/76` PASS across direct API, managed runtime and stable-host integration.
- Full suite: Vitest `99/99` PASS and Node `430/430` PASS; total `529/529`.
- Production build: PASS; TypeScript plus Vite transformed `1654` modules.
- Security/privacy: exact admin route count `4`; unknown/encoded/dot/backslash/duplicate-query variants fail closed; cookie and bearer tokens are server-injected; Origin/CSRF, content type, body size, duplicate/forbidden JSON keys, method and query boundaries are covered; missing/hostile admin and raw errors map to finite public-safe responses; getter/Proxy trap executions `0`; private locator/value scan hits `0`.
- Cross-scope behavior: wrong project, inactive authority, revoked/invalid authority and client workspace injection fail before cleanup storage access; idempotent viewer replay/conflict behavior remains covered.

## Boundaries and rollback

- Provider/browser/database/environment/deployment/alias/participant/billing/Production/registry/active-root/O2/release mutations: `0`.
- Automatic retry: `0`; false completion: `0`; private disclosure: `0`.
- Rollback is the exact enclosing commit revert or restoration of only the six source/test paths above; the pre-existing `.gitignore` carrier diff and all active-root/user-owned bytes remain outside this candidate.
- This is local Builder evidence only. Activation, QA, Release Audit, acceptance, O2 closure and release remain locked.
