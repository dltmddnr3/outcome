# Phase 3 Observer Bridge · Disabled Runtime Wiring Builder Receipt

## Terminal

BUILDER_CODE_CANDIDATE_READY_ONLY

This is a disabled-by-default local Builder candidate. It is not UX & Product QA, Release Audit, Cherry acceptance, hosted activation, deployment, or release evidence.

## Exact source and candidate

- source commit: 19c64be0ca84cf30a98a3470aa511a6d67f1698b
- source tree: b3c1126c01a183281567f20c828ab3f8c5d322db
- semantic candidate commit: 98e10d51b1ca1d6c1810afe2112b294132cb98b1
- semantic candidate tree: bf82c3ddb7884c55f0089cdca085080063568c3b
- semantic parent: 19c64be0ca84cf30a98a3470aa511a6d67f1698b
- source drift: 0

## Changed paths

Semantic candidate:

- api/index.mjs
- server/stable-host.test.mjs
- server/phase3-observer-bridge-runtime.mjs
- server/phase3-observer-bridge-runtime.test.mjs
- GATES_PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING.md

Receipt carrier adds only:

- docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md
- Gate evidence updates in GATES_PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING.md

## Implemented boundary

- Stable host recognizes only the audited private bridge route set.
- Runtime construction exists only behind an explicitly injected factory.
- Both named capability flags default false. Projection/enrollment and ingestion are independently gated, while missing or malformed pairs disable both.
- The bridge factory receives the authenticated account runtime and capability booleans, not environment bindings.
- Factory missing, throw, rejection, null, or malformed output is cached as unavailable without error detail.
- Projection and owner enrollment operations receive identity only from the existing server-side account authenticator.
- Client auth_context spoofing is rejected by the audited raw parser.
- Companion enrollment completion and event ingestion strip ambient cookie and bearer headers and do not invoke account authentication.
- Stable host disables framework body parsing for this endpoint and passes collected Buffer bytes to the audited UTF-8 parser and maximum-byte check without JSON reserialization.
- All private bridge responses are no-store. Default public/account behavior and the public mutation boundary remain unchanged.

## RED-first evidence

Initial focused command:

    node --test server/phase3-observer-bridge-runtime.test.mjs server/stable-host.test.mjs

RED result: exit 1. The new runtime test failed at import because server/phase3-observer-bridge-runtime.mjs did not exist. The isolated worktree also lacked its ignored dependency directory, so the pre-existing stable-host suite stopped at its Clerk package import; the existing canonical dependency installation was linked only as an ignored test fixture, with package and lock files unchanged.

## GREEN and regression evidence

- focused runtime plus stable host: PASS, 22/22
- audited bridge plus account plus stable focused matrix: PASS, 126/126
- full frontend: PASS, 89/89 across 5 files
- full Node: PASS, 229/229
- build: PASS, 1,652 transformed modules
- security suite: PASS, 37/37
- stable snapshot: PASS, projects 2, prohibited disclosures 0, Gate evidence fields 0
- client environment boundary: PASS, Git metadata leaks 0, sealed payload leaks 0/6
- public-mode suite: PASS, 4/4
- local mutation matrix: PASS, 32/32 exact 405; API read_only JSON 28/28
- scope: PASS, 47 product/runtime/test files
- runbook: PASS
- local public boundary: PASS, prohibited identifiers 0
- git diff check: PASS
- security/public-boundary/scope/runbook/diff: PASS

No test was weakened. The source migration, audited bridge domain/API/hosted/Postgres/operations modules, package manifest, and product UI were unchanged.

## External and activation ledger

- Supabase contacts: 0
- database connections or queries: 0
- provider, account, project, billing, credential, secret, environment, session, browser, or network mutations: 0
- deployment, push, release, or public message mutations: 0
- external mutations: 0
- runtime activation: 0

No bridge factory is supplied by the production construction point and both bridge capability flags default false. Therefore the shipped default returns finite bridge_unavailable for bridge routes and creates no persistence connection.

## Locked state

- O2: OPEN/LOCKED
- Phase 3: 17/43
- EXTERNAL_OUTCOME_COMPLETE=false
- hosted persistence adapter: OPEN
- Supabase project and migration: OPEN
- QA, Release Audit, Cherry acceptance, deploy, push, release: OPEN

## Rollback

Revert the receipt carrier, then revert semantic candidate 98e10d51b1ca1d6c1810afe2112b294132cb98b1. With no injected factory and both flags absent, the candidate is already operationally disabled; rollback requires no database, provider, environment, or external mutation.

## Accepted residual risk

- No hosted persistence adapter or real database was supplied or exercised.
- No deployed Vercel request was used; raw-byte behavior is proven locally at the stable handler and audited parser boundaries.
- An eventual activation still requires a separately authorized resource, adapter, environment binding, migration, QA, Release Audit, Cherry acceptance, and deployment.

## False-completion controls

- false_completion_count: 6
- Wiring was not described as hosted persistence.
- Local tests were not described as fresh QA.
- Builder PASS was not described as Release Audit.
- Disabled flags were not described as activation.
- Prior audited SQL was not described as applied remotely.
- A local candidate was not described as deployment, release, O2 closure, progress advancement, or external completion.

## Learning receipt

Stable-host composition can remain resource-agnostic by injecting one already-validated bridge object behind two exact capability flags. Server authentication should terminate before that adapter boundary, while companion certificate/signature routes must explicitly discard ambient browser authority. Preserving raw request bytes requires disabling framework parsing at the endpoint and keeping the audited parser as the sole JSON materialization boundary.
