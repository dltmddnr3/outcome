# Phase 3 Observer Bridge · Disabled Runtime Raw-Path Correction Fresh Independent Re-QA

## Verdict

PASS_INDEPENDENT_QA_ONLY

This is fresh independent UX & Product re-QA of the exact local correction candidate. It is not Release Audit, Cherry acceptance, hosted activation, deployment, release, O2 closure, Phase 3 completion, or external completion.

## Exact candidate and immutable evidence

- final correction carrier: `bbb0cad9ec58006454310930b1ede09cfb7b4ac5`
- final carrier tree: `bf7999253f9c7786bdea278e3c995864aed50826`
- carrier parent / semantic correction: `ca8a3ab499344c9a1ac15764145afee632736bf1`
- semantic correction tree: `9d689f2f724891fd4688d48063010ae86f79086f`
- semantic parent / prior QA FAIL carrier: `e62d207f66b461fefa1353f5079aead2dbe1850f`
- original semantic disabled runtime: `98e10d51b1ca1d6c1810afe2112b294132cb98b1`
- independently measured correction receipt SHA-256: `610be9a070e5978293a021c80384c862aec72a43e8f44369a89b76d6f4be4ce2`
- independently re-measured prior QA FAIL report SHA-256: `f675fd997fde2b4ee2e07b8c857db57354ebfc6e69f2d0a82918a3c5c2222a1a`
- semantic correction paths: `3`; `api/index.mjs`, `server/stable-host.test.mjs`, and the correction Gate only
- carrier-only paths: `2`; correction Gate evidence and the Builder receipt only

The exact carrier was checked out detached in a fresh clean worktree. Builder evidence was treated as a hypothesis: identities, hashes, source, diff, tests, activation boundaries, and locked state were measured independently. Build and generated snapshot work ran in a `git archive` execution copy so the candidate worktree remained report-only.

## Prior defect reproduction and adversarial extension

The prior literal and encoded dot-segment aliases now fail closed. A separate QA runner extended the family to `31` hostile raw targets covering:

- raw dot and dot-dot, mixed-case percent-encoded dot, and repeated encoding;
- raw/double/encoded separators with lower- and upper-case hex;
- raw, encoded, mixed-case, and repeatedly encoded backslash;
- raw NUL, control, whitespace, DEL and their encoded forms;
- incomplete and invalid percent grammar;
- trailing slash and percent-encoded route-letter aliases.

Result: `31/31` rejected and `124/124` per-alias assertions passed. For every hostile request, account authentication, account runtime factory, bridge runtime factory, and bridge operation invocation deltas were exactly `0`. Responses were finite `404` with only `bridge_unavailable` or, for non-candidate repeatedly encoded prefixes, `not_found`.

The independent runner executed `133/133` total assertions: `124` alias assertions, `6` canonical route/query/catch-all assertions, and `3` exact allowlist assertions. Canonical projection and Vercel catch-all mapping remained `200`; unknown bridge path remained finite `404 bridge_unavailable`; unsupported `PATCH` remained exact `405 read_only`.

## Runtime, authority, parser, and privacy boundaries

- absent/off, partial, malformed, accessor, and Proxy configuration fail closed;
- missing factory performs `0` attempts; throw, reject, null, and malformed outputs are cached after exactly `1` attempt across repeated selection;
- protected projection/owner operations receive only server-derived account auth context; a client `auth_context` spoof is rejected before bridge mutation;
- companion enrollment-complete/events forward neither cookie nor bearer and call account authentication `0` times;
- padded raw Buffer byte counts reach the audited parser unchanged; malformed UTF-8, duplicate JSON keys, forbidden constructor/pollution input, and oversize bodies fail before bridge/store mutation;
- framework body parsing remains disabled and the finite stable collection cap remains `1,048,576` bytes;
- private responses remain `cache-control: no-store`; public/account semantics and exact mutation denial remain unchanged;
- bridge API parser/authority suite: `9/9`; runtime config/factory suite: `5/5`; stable-host suite: `19/19`.

## Proportional independent verification

- focused correction: `2/2` PASS
- bridge/account/stable targeted matrix: `128/128` PASS
- full server Node: `231/231` PASS
- full server plus script Node: `259/259` PASS
- full frontend: `89/89` PASS across `5` files
- production build: PASS, `1,652` modules transformed
- security suite: `39/39` PASS
- public-mode suite: `4/4` PASS
- mutation boundary: `32/32` exact `405`; API `read_only` JSON `28/28`; non-API empty-body boundary `0/4`
- stable snapshot: projects `2`; prohibited disclosures `0`; Gate evidence fields `0`
- client environment boundary: Git metadata leaks `0`; sealed payload leaks `0/6`
- scope: PASS, `47` product/runtime/test files
- runbook: PASS
- local API/HTML/bundle/rendered-UI prohibited identifiers: `0`
- correction Gate structural/executable check: `6/6` met

## Activation, scope, and locked state

The production `hostedRequest` construction point injects no Observer Bridge runtime factory. The correction adds no production adapter, factory, database gateway, network call, Supabase migration or project binding, environment value, dependency, credential, deployment configuration, or release operation. Runtime activation is `0`.

- O2: `OPEN/LOCKED`
- Phase 3: `17/43`, unchanged
- `EXTERNAL_OUTCOME_COMPLETE=false`
- Release Audit: OPEN
- Cherry acceptance: OPEN
- hosted persistence, managed migration, environment activation, deploy, push, and release: OPEN

## Mutation ledger

- external messages or public communications: `0`
- network/provider/account/project/billing operations: `0`
- database connections, queries, migrations, or data writes: `0`
- credential, secret, or environment mutations: `0`
- browser, device, runtime, or session operations: `0`
- push, deploy, release, or hosted activation: `0`
- external mutations: `0`

## Authority boundary

`PASS_INDEPENDENT_QA_ONLY` means the pinned disabled-runtime raw-path correction passed this fresh re-QA. It does not close or authorize Release Audit, Cherry acceptance, O2, Phase 3 progress, production adapter work, hosted persistence, Supabase activation, deployment, release, or external completion.
