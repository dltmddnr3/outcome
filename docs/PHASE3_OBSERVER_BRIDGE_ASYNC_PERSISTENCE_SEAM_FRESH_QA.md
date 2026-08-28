# Phase 3 Observer Bridge · Async Persistence Seam Fresh Independent QA

Verdict: **PASS_INDEPENDENT_QA_ONLY**

Observed: 2026-08-27 KST

This is a fresh, independent UX & Product QA review of the exact receipt carrier. It is separate from Builder and prior reviewers. Builder prose and counts were treated as claims and remeasured from Git, source, tests, and isolated adversarial probes.

## Immutable candidate

- receipt carrier: `f3badeec4fa45aa77368316a0dd690d2a5f75da2`
- carrier tree: `479b6b8ca28c6db6ac8e4de06e4c7332d21d70fa`
- carrier parent / semantic candidate: `84d56664bad5e565f5320e3a0c80ed1f4d45f7f4`
- semantic tree: `479d69eda14e46b16bc1e4219c3cb1942bfec19b`
- semantic parent / exact audited source: `f9e441cb20b78d32136b60cbe2a3f522fd9aac73`
- source tree: `9544fca8b8a381574d6affa647e17eb7c8710eec`
- source parent: `6b93799b95d5bda87ac028d83b9fadcc44494a83`
- Builder receipt SHA-256: `032b7200a1027fcc6f1c8023095a6d8e934eb62a08660a03c39616b84ad395f5`
- source drift: `0`

The semantic diff changes five paths: one new Gate, `api/index.mjs`, the bridge API implementation, its focused test, and the stable-host test. The carrier adds the Builder receipt and fixes Gate evidence. Across source to carrier there are exactly six unique paths. Production behavior changes are limited to making `handleHostedObserverBridgeRequest` async, awaiting its six operation sites, and explicitly awaiting it in the stable host. Parser, validation, authorization, response mapping, runtime control, dependencies, and environment-name code are otherwise byte-identical to the audited source.

## Six endpoint result contract

All six endpoints were exercised with synchronous success, asynchronous success, synchronous known/unknown throw, and asynchronous known/unknown rejection:

1. projection → `read`
2. enrollment → `createEnrollment`
3. completion → `completeEnrollment`
4. revocation → `revokeSource`
5. rotation → `createEnrollment`
6. events → `ingest`

The candidate-focused matrix passed `4/4` tests and proves:

- `12/12` sync/async success cases return identical finite status/body values;
- `24/24` known/unknown sync/async failures map to finite public-safe errors;
- every result body is settled before response construction and is never Promise-valued;
- known `HostedObserverBridgeError` mapping remains exact; unknown detail becomes `503 {"error":"bridge_unavailable"}` with no raw error, stack, identifier, or partial body.

## Adversarial async and exactly-once review

An independent temporary probe outside the candidate ran `13/13` hostile cases:

- six thenables attempted resolve, reject, then resolve again; first settlement won, the then function ran once, the bridge method ran once, and the body was finite;
- six delayed rejections used a partial-response-looking rejection value; all returned only the finite `503 bridge_unavailable` response with no partial-looking value disclosure;
- one throwing `then` accessor was evaluated exactly once and failed closed after one bridge invocation.

Across these probes and the candidate suite:

- selected operation invocations: exactly `1` per request;
- retries after async rejection or uncertain completion: `0`;
- observed `unhandledRejection` events: `0`;
- late reject/resolve attempts changed the settled result: `0`;
- raw hostile detail disclosures: `0`.

This seam intentionally adds no timeout, cancellation, uncertain-completion reconciliation, or retry policy.

## Validation and authority ordering

The awaited operation remains inside the existing finite-error `try` boundary. Production diff review confirms no movement or modification of the pre-operation checks. Focused and regression suites confirm that the following still fail closed in their established order:

- raw request-target rejection for dot, encoded separator, backslash, control, fragment, and invalid-percent aliases before authority selection;
- exact private path/method allowlist;
- raw UTF-8 byte cap before parsing or authorization;
- JSON materialization, depth, duplicate-key, forbidden-key, Proxy, accessor, and prototype-pollution rejection;
- exact `application/json` requirement;
- owner origin/CSRF pair;
- server-derived owner/viewer authentication and client `auth_context` rejection;
- companion completion/event ambient cookie and authorization stripping;
- bridge selection and storage are not reached on the covered pre-auth failures.

Private responses remain `no-store`. Public/account behavior and the exact mutation-closed `405` boundary are unchanged.

## Call-site and default-production inventory

Repository inventory found exactly three non-document/Gate files containing `handleHostedObserverBridgeRequest`:

- `server/phase3-observer-bridge-api.mjs`: async implementation;
- `api/index.mjs`: explicitly awaited stable-host caller;
- `server/phase3-observer-bridge-api.test.mjs`: all calls awaited by async tests.

Unawaited or incorrectly consumed production callers: `0`.

Default production still constructs `createStableHostRequestHandler({ logger: console })` without a bridge runtime factory. Runtime configuration defaults both named capabilities to false and selection also requires an explicitly injected factory plus a valid authenticated account runtime. New bridge factory bindings, DB driver packages, connection strings, bridge driver/URL environment names, Supabase project wiring, and hosted activation added by this candidate: `0`.

## Independently remeasured verification

| Check | Result |
|---|---:|
| independent hostile async probes | `13/13` PASS |
| focused async seam patterns | `4/4` PASS |
| bridge API + stable host | `33/33` PASS |
| bridge/account targeted matrix | `115/115` PASS |
| full Node | `236/236` PASS |
| frontend | `89/89` PASS across `5/5` files |
| production build | PASS; TypeScript + Vite, `1,652` modules |
| security Node matrix | `40/40` PASS |
| stable snapshot boundary | PASS; projects `2`, prohibited disclosures `0`, Gate evidence fields `0` |
| client environment boundary | PASS; Vercel Git metadata leaks `0`, sealed payload leaks `0/6`, Clerk markers `3`, assets `2` |
| public mode | `4/4` PASS |
| local mutation matrix | `32/32` exact `405`; API `read_only` JSON `28/28`; empty page boundary `0/4` |
| scope | PASS; `47` product/runtime/test files; unapproved dependency hits `0` |
| runbook | PASS |
| call-site inventory | PASS; `3` files, unawaited callers `0` |
| production bridge factory bindings | `0` |
| new bridge driver/connection/environment hits | `0` |
| candidate Gate checker | `7/7` ALL MET |
| `git diff --check` | PASS |

The browser-rendered public-boundary script was not run because this QA authority explicitly forbids browser/session operations. Proportional non-browser evidence is supplied by the unchanged production diff, stable-host/no-store tests, public-mode tests, stable-snapshot validator, client-environment build boundary, mutation matrix, and full frontend/Node suites.

## Governance and locked state

Durable promoted additive receipts retain Phase 3 at `17/43`; O2 remains `OPEN/LOCKED`. The older canonical `docs/OUTCOME_CONTRACT.md` and `docs/OUTCOME_MAP.md` text still displays `6/43`, a pre-existing reconciliation lag that this report does not mutate or reinterpret as completion. The candidate changes no progress source and does not close any Gate.

- disabled local async seam only: confirmed;
- Supabase project/driver/connection/timeout policy: not added and not proven;
- O2: `OPEN/LOCKED`;
- Phase 3 promoted additive progress: `17/43`, unchanged and incomplete;
- `EXTERNAL_OUTCOME_COMPLETE=false`;
- network, Supabase, provider, account, project, billing, database, migration, credential, environment, browser, device, or session operations: `0`;
- push, deploy, release, external message, and other-session mutation: `0`;
- external mutations: `0`.

## Verdict boundary

**PASS_INDEPENDENT_QA_ONLY** applies only to this exact disabled local async persistence seam candidate and its immutable carrier. It does not grant Release Audit, Cherry acceptance, O2 proof, Supabase/hosted wiring, deployment, release, progress closure, or external completion. A separate fresh Release Audit must inspect this same pinned carrier and this report-only child.
