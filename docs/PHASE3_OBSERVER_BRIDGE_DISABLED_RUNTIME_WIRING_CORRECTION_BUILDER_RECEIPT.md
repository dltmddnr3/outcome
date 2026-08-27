# Phase 3 Observer Bridge · Disabled Runtime Raw-Path Correction Builder Receipt

## Terminal

BUILDER_CORRECTION_CANDIDATE_READY_ONLY

This is a local Builder correction candidate for fresh independent QA. It is not QA PASS, Release Audit, Cherry acceptance, hosted activation, deployment, or release evidence.

## Exact authority and candidate

- QA FAIL carrier: e62d207f66b461fefa1353f5079aead2dbe1850f
- QA FAIL tree: aa77de7823fca19b3de68533c61d499031caf5bc
- QA carrier parent: 2a889d90c52545e37302648805e29add000993ee
- QA report SHA-256: f675fd997fde2b4ee2e07b8c857db57354ebfc6e69f2d0a82918a3c5c2222a1a
- semantic correction commit: ca8a3ab499344c9a1ac15764145afee632736bf1
- semantic correction tree: 9d689f2f724891fd4688d48063010ae86f79086f
- semantic parent: e62d207f66b461fefa1353f5079aead2dbe1850f
- source/report drift: 0

The QA FAIL report is byte-identical and unchanged.

## Changed paths

Semantic correction:

- api/index.mjs
- server/stable-host.test.mjs
- GATES_PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION.md

Receipt carrier adds only:

- docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md
- correction Gate evidence updates

## Correction

- Raw request targets are split without WHATWG URL pathname normalization.
- Bridge-candidate detection recognizes raw or encoded separators only to route them into the rejection boundary; it never converts them into authority.
- Any bridge path containing raw dot, percent encoding, slash-encoded alias, backslash, encoded backslash, control or space, fragment ambiguity, or invalid percent syntax fails before account runtime or bridge factory selection.
- Exact raw allowlist membership remains mandatory after validation.
- Query parsing still uses URLSearchParams after the raw path is isolated, so canonical projection queries and Vercel catch-all query removal remain intact.
- The default request mapper preserves literal and encoded dot segments for stable-handler rejection instead of silently canonicalizing them.

## RED-first evidence

Command:

    node --test --test-name-pattern='raw bridge aliases|request target preserves raw bridge aliases' server/stable-host.test.mjs

RED: exit 1, 0/2 passed. Literal events/../projection returned 200 and requestPath rewrote it to the allowlisted projection path, reproducing QF-1.

GREEN: 2/2 passed. Fifteen direct hostile aliases return 404 bridge_unavailable with account authentications 0, bridge factory calls 0, and bridge operation calls 0. Literal and encoded dot targets also remain raw through requestPath and the Vercel catch-all mapping before rejection.

## Regression evidence

- focused correction: PASS, 2/2
- stable host: PASS, 19/19
- focused bridge/account/stable: PASS, 128/128
- full frontend: PASS, 89/89 across 5 files
- full Node: PASS, 231/231
- build: PASS, 1,652 transformed modules
- security: PASS, 39/39
- public mode: PASS, 4/4
- mutation boundary: PASS, 32/32 exact 405; API read_only JSON 28/28
- stable snapshot: PASS, projects 2, prohibited disclosures 0, Gate evidence fields 0
- client environment boundary: PASS, Git metadata leaks 0, sealed payload leaks 0/6
- scope: PASS, 47 files
- runbook: PASS
- public boundary: PASS, prohibited identifiers 0
- security/public/mutation/scope/runbook/boundary/diff: PASS

Prior canonical bridge queries, independent capability flags, factory failure caching, server auth context, client spoof denial, companion ambient-auth removal, raw bytes/body cap, private no-store, public/account behavior, and exact mutation allowlists remain covered and passing.

## External mutation ledger

- Supabase/network/provider/account/project/billing/database/migration contacts or mutations: 0
- credential, secret, environment, browser, device, or session mutations: 0
- push, deploy, release, public message, or external operations: 0
- external mutations: 0
- runtime activation: 0

## Locked state

- O2: OPEN/LOCKED
- Phase 3: 17/43
- EXTERNAL_OUTCOME_COMPLETE=false
- fresh corrected-candidate QA: OPEN
- Release Audit and Cherry acceptance: OPEN
- Supabase, hosted persistence, migration, environment activation, deploy, push, release: OPEN

## Rollback

Revert the receipt carrier, then revert semantic correction ca8a3ab499344c9a1ac15764145afee632736bf1. External rollback is unnecessary because external mutations and runtime activation are zero.

## False-completion controls

- false_completion_count: 6
- A passing Builder correction is not fresh QA.
- Raw-path rejection is not hosted persistence.
- Local regression is not Release Audit.
- Disabled runtime wiring is not activation.
- Audited SQL remains unapplied remotely.
- This candidate does not close O2, advance Phase 3, establish external completion, deploy, push, or release.

## Learning receipt

Security-sensitive routing authority must never derive from a lossy URL pathname normalizer. Preserve the raw request target through catch-all mapping, classify suspicious bridge aliases only for rejection, validate the raw path, and parse query parameters separately after the exact path boundary is established.
