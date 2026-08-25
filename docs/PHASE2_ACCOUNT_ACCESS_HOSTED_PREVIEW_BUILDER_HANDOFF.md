# Phase 2 · Account Access Hosted Preview HP0 Builder Handoff

Status: `PLANNER HANDOFF · NO_EXTERNAL_MUTATION`

Preparation Gate: `GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_PREPARATION.md`

Implementation Gate: `GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS.md` B1-B8

Decision source: approved K1-K6 account-access contract plus `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md` HP0 only.

## Outcome

Prepare the repository for a later Clerk/Supabase hosted preview while leaving the default and deployed product private-disabled. Return a credential-free immutable code candidate that can be bound only after separate Cherry HP1/HP2 authority.

## Required source verification before editing

- Confirm exact base commit/tree and clean status except the untouched unrelated `docs/ROADMAP 2.md`.
- Read `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`, the hosted-preview authorization packet, current account implementation/evidence and current API/server adapters.
- Reproduce that the Vercel stable handler returns private config disabled and private workspace 401.

## Allowed product-code surface

- `api/**`
- `server/account-access*.mjs`
- `server/index.mjs` only if shared adapter wiring requires it
- `src/components/AccountWorkspace*`
- `src/lib/api.ts`
- `supabase/migrations/**` only for a forward-compatible correction proven against the existing exact migration
- account-access-specific tests and browser checks
- `package.json` and lockfile only for exact Clerk/Supabase runtime dependencies actually used
- one new HP0 evidence document and a dedicated HP0 implementation Gate

Do not edit unrelated dashboard hierarchy, Package parser, Cherry Note sources, global visual design, registry content or `docs/ROADMAP 2.md`.

## Required implementation slices

1. Define a provider adapter that verifies Clerk sessions, derives the canonical subject server-side, begins Google/email-code auth, links Apple only from an authenticated canonical owner, logs out and supports operator revocation.
2. Define a hosted store adapter that uses the existing schema and server-derived workspace/project scope. No client selector grants authority.
3. Wire the Vercel private API path behind complete environment validation and `OUTCOME_PRIVATE_SURFACE_ENABLED=1`; partial configuration must fail closed without revealing which value is missing.
4. Preserve the current config/body contract and all public GET/405/redaction/receipt behavior.
5. Keep an injectable fake adapter for deterministic red-first tests, but label it synthetic and never share its positive state with default/production code.
6. Add exact environment-name validation. Never print values, subject, email, token, cookie or database connection strings.
7. Add rollout/rollback checks proving that removing the activation flag returns the current disabled/401 behavior.

## Red-first requirements

Before implementation, add failing tests for:

- complete env + adapter selection versus absent/partial env fail-closed;
- valid canonical owner, wrong owner, revoked/expired session and provider outage;
- Apple unlinked denial and linked-owner success;
- forged workspace/project denial and two-project allowlist;
- hosted-store/RLS adapter error mapping without cross-project fallback;
- logout/revoke and cookie security contract;
- Vercel default private config disabled, workspace 401 and every mutation 405;
- no secret/account identifier in built assets, public API, logs or evidence.

## Mandatory verification

- focused new red-first tests;
- `npm run test:account-access`;
- `npm run test:account-access-browser`;
- `npm run test:security`;
- `npm run test`;
- `npm run test:browser`;
- `npm run test:stable-browser`;
- `npm run check:public-boundary`;
- `npm run check:mutations`;
- `npm run check:scope`;
- `npm run check:runbook`;
- `npm run build:vercel` and isolated build parity as applicable.

## Evidence return

- exact base and candidate commit/tree;
- changed-path list and dependency/version rationale;
- red-first failure and green result counts;
- named environment contracts only;
- default-disabled, partial-config fail-closed and rollback evidence;
- public regression/redaction/mutation results;
- limitations: no real OAuth, hosted Supabase, provider account, secret, deployment, QA, Audit, Cherry acceptance or release.

Terminal result must be exactly `CODE_READY_ONLY` or `BLOCKED`. No push, deploy, Clerk/Google/Apple/Supabase/Vercel resource or environment mutation, paid purchase, domain/DNS change, QA/Audit verdict, Cherry acceptance, release, Phase completion or `EXTERNAL_OUTCOME_COMPLETE` authority is granted.
