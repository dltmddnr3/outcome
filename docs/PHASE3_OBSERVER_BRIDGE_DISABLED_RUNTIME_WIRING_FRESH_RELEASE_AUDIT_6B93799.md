# Phase 3 Observer Bridge · Disabled Runtime Wiring Fresh Release Audit

Status: **PASS_RELEASE_AUDIT_ONLY / LOCAL DISABLED RUNTIME CANDIDATE ONLY**

## Verdict

`PASS_RELEASE_AUDIT_ONLY`

The exact immutable chain passes this fresh, independent Release Audit. This verdict accepts only the local, disabled-by-default runtime-wiring candidate and its raw-target correction. It is not Cherry acceptance, managed Supabase parity, hosted adapter/resource/environment evidence, O2 proof, Phase 3 progress authority, activation, deployment, release, or external completion.

## Audit binding and independence

- job profile: `lime-release-qa`, with bounded security/privacy review
- candidate worktree: fresh, detached, and clean at audit start
- product/Builder worktree reuse: none
- candidate product, test, Gate, and prior-report mutations by auditor: `0`
- permitted mutation: this report only
- skill digests independently pinned:
  - `whitecastle-execution-core`: `91a23d99281a6db1c10561deb6f9c7325bfaf09d02a680760c1894f9d6d47799`
  - `lime-independent-qa`: `ba1cc2193a9452930eb7153d7f376d3134bb1f11bc305bf270db5dd0ace978d7`
  - `lime-release-auditor`: `f9e7987f23171a60dad542a04936f4c86e369fcd5c5bc1f11f8164a0a8df1e0d`
  - `lime-security-privacy-auditor`: `6e71d1f31367e2fe70d6d06edec4363dc39726e78a5a577ed4cdef4632b851c4`
  - `karpathy-guidelines`: `6e22cc54cb02a5e98ae42d06d9d7292db0c1b43894831b32879beb0166b2aea7`
  - `unlazy`: `4a5a82879785f77a5a1b35558ace1f48c21662914abe94167e20a636f6cf25fc`

## Commit pin and evidence graph

The supplied identities were treated as hypotheses and re-read from Git objects:

| Role | Commit | Tree | Direct parent | Exact changed scope |
|---|---|---|---|---|
| final QA carrier | `6b93799b95d5bda87ac028d83b9fadcc44494a83` | `f6eaad18e5fce1244b491ddafbc5a1f0c4bf5e6b` | `bbb0cad9ec58006454310930b1ede09cfb7b4ac5` | one new re-QA report |
| correction receipt carrier | `bbb0cad9ec58006454310930b1ede09cfb7b4ac5` | `bf7999253f9c7786bdea278e3c995864aed50826` | `ca8a3ab499344c9a1ac15764145afee632736bf1` | correction Gate evidence plus one Builder receipt |
| semantic correction | `ca8a3ab499344c9a1ac15764145afee632736bf1` | `9d689f2f724891fd4688d48063010ae86f79086f` | `e62d207f66b461fefa1353f5079aead2dbe1850f` | `api/index.mjs`, `server/stable-host.test.mjs`, correction Gate |
| preserved prior QA FAIL carrier | `e62d207f66b461fefa1353f5079aead2dbe1850f` | `aa77de7823fca19b3de68533c61d499031caf5bc` | `2a889d90c52545e37302648805e29add000993ee` | one new FAIL report |
| original Builder carrier | `2a889d90c52545e37302648805e29add000993ee` | `95ecc24e6ce64e05321bbf76df3032873b09356f` | `98e10d51b1ca1d6c1810afe2112b294132cb98b1` | wiring Gate evidence plus one Builder receipt |
| original semantic runtime | `98e10d51b1ca1d6c1810afe2112b294132cb98b1` | `bf82c3ddb7884c55f0089cdca085080063568c3b` | `19c64be0ca84cf30a98a3470aa511a6d67f1698b` | five allowed source/test/Gate paths |
| exact original parent | `19c64be0ca84cf30a98a3470aa511a6d67f1698b` | `b3c1126c01a183281567f20c828ab3f8c5d322db` | `2156bd80de5645d355ae8b627d98a46a2b184c4e` | outside this candidate |

The chain is linear. The earlier QA `FAIL` remains immutable in history; it was not amended, removed, or reclassified. Unique candidate scope relative to the original parent is ten paths: two Gates, two source files, two test files, two Builder receipts, the prior QA FAIL report, and the corrected re-QA report. No package, dependency, migration, Supabase, environment, Vercel, deployment, or product-document path changed.

### Rehashed evidence bytes

- original Builder receipt: `1ca53291614e0e7aead81b5d35a58ac9eaea248d67ff11085c5e81cc03c8d78b`
- correction Builder receipt: `610be9a070e5978293a021c80384c862aec72a43e8f44369a89b76d6f4be4ce2`
- prior QA FAIL report: `f675fd997fde2b4ee2e07b8c857db57354ebfc6e69f2d0a82918a3c5c2222a1a`
- corrected re-QA report: `58297bff0de29c39af22a47b36f01077da3e7bfefe3d046e1fcbe59dd7d3dd2e`
- original wiring Gate: `3cd20f4e5fcd7befb37a593c748b4becfbf185ac4e5c072a18a1ec37093c254b`
- raw-target correction Gate: `2a6a5bfd328de5244420daa2b713cf685a1ceadbfa3cef628879de83a31e07aa`

Both Gate ledgers were independently executed: wiring `9/9` met; correction `6/6` met.

## Threat model and security/privacy verdict

### Threat model

- assets: account identity, owner/viewer authority, bridge enrollment/source state, signed events, private projection, raw request bytes, secret-bearing server environment
- entry points: stable-host raw request target, Vercel catch-all mapping, bridge query/body/header boundary, runtime configuration, account and bridge factories
- attacker goals: normalize a hostile alias into an allowlisted route; spoof auth context; smuggle ambient cookie/bearer authority; trigger factories while disabled; bypass body/parser limits; enumerate private state; leak secrets or enable hosted resources
- trust boundaries: raw target before URL parsing, exact route/method allowlist, server-derived account authentication, companion credential stripping, audited raw parser, injected factory boundary, private response cache boundary

### Authz, routing, and abuse cases

- An independent 31-target hostile family covered raw/encoded/repeated dots, separators, backslashes, control/space/DEL, invalid percent grammar, fragments, trailing slash, and encoded letters.
- Result: `31/31` rejected with `155/155` per-target status/error/isolation assertions. During hostile traffic, account runtime factories, account authentications, bridge factories, and bridge operations were each exactly `0`.
- Canonical projection, canonical Vercel catch-all mapping, unknown bridge path, and unsupported method passed `4/4` adjacent assertions; canonical operation occurs only after the hostile isolation counters are proven zero.
- Exact server-authenticated owner/viewer context is injected by the host. Client `auth_context` spoofing fails before bridge mutation.
- Companion completion/events receive neither cookie nor bearer; account authentication remains `0` for those paths.
- Unknown/private failures are finite and non-enumerating. Exact mutation denial remains `32/32` status `405`, with API `read_only` JSON `28/28` and non-API empty-body boundary `0/4`.

### Factory, body, cache, and secret boundaries

- Absent configuration independently measured `enabled=false`, `projectionEnrollmentEnabled=false`, and `ingestionEnabled=false`.
- The default production construction point supplies no `bridgeRuntimeFactory`. An explicit empty-environment probe returned `bridge_unavailable` with account factory calls `0` and bridge factory calls `0`.
- Missing factory attempts are `0`; throw, reject, null, malformed, Proxy, and accessor cases fail closed and cache one attempted construction across repeated selection.
- Raw Buffer bytes reach the audited parser unchanged. The stable collection cap is finite at `1,048,576` bytes; the bridge runtime cap must be a positive safe integer no greater than that value.
- Oversize, malformed UTF-8, duplicate-key, forbidden `constructor`/pollution, Proxy, accessor, and client-authority bodies fail before bridge/store mutation.
- Private responses remain `cache-control: no-store`.
- The semantic diff introduces only two capability variable names. It adds no value, secret default, credential, public serialization, dependency, network client, provider binding, database gateway, or deployment configuration. Client environment scanning found Git metadata leaks `0` and sealed payload leaks `0/6`.

### RLS, privacy, retention, deletion/export

- This candidate does not apply or activate a managed database. Existing bridge Postgres tests run only against local in-memory PGlite.
- The full Node matrix independently revalidated forced RLS, explicit least grants, anonymous/cross-workspace/write denial, NOLOGIN/NOBYPASSRLS backend role, parameterized SQL, transactional CAS, and zero prohibited serialized authority.
- Existing operations tests revalidated privacy-minimal projections/audits, count-only tombstones, raw-scope purge, no resurrection on restore, revision-bound export, revocation, expiry, rate and cost limits.
- Managed Supabase parity and hosted retention/deletion/export behavior remain open; no local test is promoted into hosted evidence.

Security/privacy quality score: `98/100` (profile threshold `95`). No release-blocking counterexample remained within the bounded local candidate.

## Regression, runtime, and build matrix

All generating commands ran in an exact `git archive` execution copy. The detached candidate worktree remained report-only.

| Matrix | Independent result |
|---|---|
| focused raw-path correction | `2/2` PASS |
| focused bridge/account/stable files | `52/52` PASS |
| full server Node | `231/231` PASS |
| full server plus script Node | `259/259` PASS |
| full frontend | `89/89` PASS across `5/5` files |
| production build | PASS; `1,652` modules transformed |
| security suite | `39/39` PASS |
| public mode | `4/4` PASS |
| mutation boundary | `32/32` exact `405`; API JSON `28/28`; non-API empty `0/4` |
| stable snapshot | projects `2`; prohibited disclosures `0`; Gate evidence fields `0` |
| client environment boundary | Git metadata leaks `0`; sealed payload leaks `0/6` |
| scope | PASS; `47` product/runtime/test files |
| runbook | PASS |
| public boundary | prohibited identifiers `0` |
| project Gates | wiring `9/9`; correction `6/6` |

Public and account meanings are unchanged by the correction. Accessibility is `N/A` for new behavior because the semantic diff contains no UI, copy, style, interaction, or accessibility surface; the unchanged frontend still passed `89/89`. No physical-device or visual acceptance is inferred.

Release quality score: `98/100` (profile threshold `94`). Regressions found: `0` after correction. Residual unknowns within the authorized local-disabled candidate: `[]`.

## Operational and release truth

- local disabled runtime candidate: PASS for this audit only
- production bridge factory/adapter: absent
- both bridge capabilities by default: false
- runtime activation: `0`
- database/Supabase/network/provider/account/project/billing contact or mutation: `0`
- environment/secret/credential mutation: `0`
- browser/device/session operation: `0`
- push/deploy/release/public-message operation: `0`
- external mutations: `0`

Still open and unauthorized:

- managed Supabase migration and parity
- hosted adapter, runtime resource, provider binding, and environment values
- hosted retention, deletion/export, rollback, cost, and monitoring proof
- O2 real two-viewer proof
- Phase 3 progress transition or completion
- Cherry acceptance
- activation, deployment, release, and external completion

The exact candidate does not change package progress documents. `EXTERNAL_OUTCOME_COMPLETE` remains false. The additive Phase 3 promotion evidence and the older canonical package projection use different recorded progress snapshots; this audit does not reconcile or advance either snapshot and relies only on the shared truth that Phase 3 is incomplete and progress authority remains with Planner/Cherry.

## Rollback

A mechanical reverse-order rehearsal of `6b93799b`, `bbb0cad9`, `ca8a3ab4`, `e62d207f`, `2a889d90`, and `98e10d51` produced write-tree `b3c1126c01a183281567f20c828ab3f8c5d322db`, exactly equal to the original parent tree. This proves the complete local chain is byte-reversible without conflict. No external rollback is required because activation and external mutations are zero. Reverting only the correction would intentionally restore the known raw-path defect and is not a safe release state.

## Handoff and reproduction

Handoff recipient: OUTCOME Planner for evidence registration, then Cherry for a separate acceptance decision. Reproduce from the pinned carrier in a fresh detached worktree; rehash the six evidence files above; execute both Gate files with the unlazy Gate checker; run the listed Node/frontend/build/security/public/mutation/scope/runbook/boundary commands in an archive copy; then repeat the 31-target hostile isolation matrix and default-off zero-factory probe.

`PASS_RELEASE_AUDIT_ONLY`
