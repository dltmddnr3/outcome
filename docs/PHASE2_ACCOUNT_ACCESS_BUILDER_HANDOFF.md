# Phase 2 · Account Access Builder Handoff

Status: `PLANNER HANDOFF · BUILDER CANDIDATE REQUIRED`

Source contract: `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md` K1-K6

Owning Gate: `GATES_PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION.md` I1-I8

## Outcome

Build the smallest provider-neutral, locally and preview-verifiable foundation for the approved Cherry-only authenticated read-only workspace while preserving the existing public sanitized dashboard exactly. The candidate must make every security, data and operations boundary testable without requiring or fabricating production credentials or resources.

## Dispatch pin

The Planner dispatch receipt must name the exact pushed base commit containing this handoff. Builder starts from that exact commit in an isolated worktree and returns a different exact candidate commit. A branch name, working-tree description or latest-main reference is insufficient.

## Allowed paths

- `src/**`
- `server/**`
- `api/index.mjs`
- `scripts/**`
- `test/**`
- `supabase/migrations/**` as new deterministic SQL only
- `package.json`, `package-lock.json`
- `vercel.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`
- `GATES_PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION.md` evidence fields only
- `docs/PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION_EVIDENCE.md` as new evidence output

Everything else is read-only. In particular, Builder must not edit `docs/OUTCOME_CONTRACT.md`, `docs/OUTCOME_MAP.md`, `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`, any definition/QA/Audit/Cherry Gate, stable source snapshot, unrelated roadmap documents or another project.

## Required implementation slices

1. Red-first public regression harness: unauthenticated public page/API/health remain reachable, sanitized and GET-only; every mutation remains canonical `405`.
2. Provider-neutral authentication boundary: Google primary, Apple-link-only and email-code fallback are modeled behind named runtime configuration with no secret defaults. Login, logout, seven-day expiry, revocation, recovery and provider outage fail closed.
3. Server-owned authorization: derive canonical owner/workspace membership server-side, restrict the initial allowlist to Cherry Note and OUTCOME, reject forged/unknown/stale/cross-workspace access, and never fall back to another workspace or public payload.
4. Deterministic data contract: migrations and synthetic fixtures for owner/workspace/project binding, append-only Package snapshots/current pointer, deployment receipts, redacted security events and deletion/export jobs. RLS and grants deny by default.
5. Safe private UI states: public/private distinction plus login, loading, empty, stale, conflict, unavailable, session-expired, access-denied and safe degraded read-only states. Preserve current-vs-selected hierarchy semantics and responsive/keyboard/touch behavior.
6. Operations contract: path-bounded request limiting, idempotent sync rejection, metric/alert schema, `$40/$60/$75` cost-state behavior, redacted incident receipt and private-surface rollback switch.
7. Reproducible evidence: exact changed files, red-first failures, final commands/results, migration hashes, candidate commit/tree/assets, preview boundary, known limitations and rollback steps.

## Required tests

- Unit/integration tests for each auth/session transition and every deny case.
- RLS/schema tests using synthetic identities and two workspaces even though v1 exposes one owner.
- Public mutation matrix and prohibited-disclosure scan.
- Snapshot/receipt freshness and conflict tests; session activity must never refresh evidence.
- MacBook and mobile browser checks for all new states, 200% zoom, keyboard focus, touch targets, reduced motion, overflow/overlap and Korean primary copy.
- Full existing frontend, Node, stable-host, scope and production-build suites.

## Non-scope and mutation boundary

Do not create or configure Clerk/Supabase/Google/Apple/Vercel production resources, OAuth consent screens, Apple keys, accounts, secrets, paid plans, domains or production databases. Do not deploy, push, release or mutate external state unless the Planner supplies a later exact authorization. Do not add self-signup, invitations, organizations, multi-user admin, project creation, session relay/chat, role dispatch, background autonomous sync, dashboard writes, approval/release controls, NOL AX or Cherry Picker.

If a required proof needs a real provider or production resource, implement the named adapter/contract and a synthetic test double, record the blocked probe, and stop that proof open. Never replace it with a claimed PASS.

## Handoff result

Builder returns `CANDIDATE_READY_ONLY` or `BLOCKED`, never QA PASS, release PASS, Cherry acceptance, Phase 2 completion or external outcome completion. `CANDIDATE_READY_ONLY` requires I1-I8 evidence, a clean allowed-path diff and an immutable commit. It becomes eligible only for fresh UX & Product QA.
