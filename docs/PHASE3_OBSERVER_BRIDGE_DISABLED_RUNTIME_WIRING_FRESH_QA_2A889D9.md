# Phase 3 Observer Bridge · Disabled Runtime Wiring Fresh Independent QA

## Verdict

FAIL

This is fresh independent UX & Product QA of the exact local disabled-runtime candidate. It is not Builder approval, Release Audit, Cherry acceptance, hosted activation, deployment, release, O2 closure, Phase 3 completion, or external completion.

## Exact candidate and receipt

- final Builder carrier: `2a889d90c52545e37302648805e29add000993ee`
- final Builder tree: `95ecc24e6ce64e05321bbf76df3032873b09356f`
- carrier parent / semantic commit: `98e10d51b1ca1d6c1810afe2112b294132cb98b1`
- semantic tree: `bf82c3ddb7884c55f0089cdca085080063568c3b`
- semantic parent: `19c64be0ca84cf30a98a3470aa511a6d67f1698b`
- independently measured Builder receipt SHA-256: `1ca53291614e0e7aead81b5d35a58ac9eaea248d67ff11085c5e81cc03c8d78b`
- semantic changed paths: 5; exact allowed set only
- carrier-only changed paths relative to the semantic commit: 2; Gate evidence update plus the Builder receipt
- total unique changed paths relative to the exact source parent: 6
- source, test, Gate, and receipt diff check: PASS

QA used a fresh detached worktree at the exact carrier. Commands that can generate snapshot or build output ran in exact `git archive` execution copies so the candidate worktree remained isolated from the dirty canonical worktree and from generated artifacts.

## Blocking finding

### QF-1 · High · raw dot-segment bridge paths are normalized into allowlisted routes

- Reproduction:
  1. Construct the stable handler with complete synthetic account configuration, both bridge capabilities enabled, an injected synthetic account runtime, and an injected synthetic bridge.
  2. Send authenticated `GET /api/private/bridge/events/../projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome`.
  3. Repeat with `/api/private/bridge/events/%2e%2e/projection?...`.
- Expected: both raw paths are outside the exact bridge path allowlist and return finite non-enumerating `404 {"error":"bridge_unavailable"}` without account authentication or bridge invocation.
- Actual: both return `200 {"projections":[]}`; account authentication runs twice and the bridge `read` operation runs twice.
- Cause: `isBridgePathname`, `bridgeLocation`, and `requestPath` use `new URL(...).pathname`, which removes literal and percent-encoded dot segments before the exact-path membership check.
- Impact: the candidate does not satisfy the exact raw bridge path allowlist or the requirement that unknown paths fail closed. Authorization and normalized method checks still apply, so this probe did not demonstrate owner/viewer escalation, but policy, routing, and logging can disagree about the route that was requested.
- Fix owner: Builder.
- Required correction: reject non-canonical raw path aliases before URL pathname normalization, then add literal and percent-encoded dot-segment regression cases at both stable-handler and deployed-request parsing boundaries. A fresh independent QA run must assess the corrected immutable candidate.

Trailing slash, double slash, and percent-encoded letter aliases were independently rejected `404`; the defect is specifically reproducible for dot-segment canonicalization.

## Independent acceptance evidence

### Disabled configuration and construction

- absent configuration: both capabilities false and bridge unavailable
- partial and malformed pairs: fail closed; bridge factory calls `0`
- missing factory: construction calls `0`
- throw, reject, null, and malformed factory outputs: finite `bridge_unavailable`; construction calls exactly `1` across repeated requests
- runtime configuration accessor and Proxy probes: fail closed without getter/trap execution

### Existing behavior, authority, and privacy

- public and account-focused regressions: PASS
- public mutation matrix: `32/32` exact `405`; API `read_only` JSON `28/28`; non-API empty-body boundary `0/4`
- private bridge response cache boundary: `no-store`
- server-authenticated projection and owner context: PASS; client `auth_context` spoof returns `400` before bridge mutation
- companion complete/events ambient cookie and bearer removal: PASS; account authentication calls `0`
- normalized unknown path defect: FAIL as QF-1

### Raw body and parser

- raw padded Buffer byte length reaches the audited parser unchanged: PASS
- body cap: oversize returns `400 body_too_large`
- malformed UTF-8: `400 bad_request`
- duplicate JSON key: `400 bad_request`
- forbidden nested `constructor` key: `400 bad_request`
- parser failures above caused bridge/store mutation count `0`
- framework body parsing remains disabled at the endpoint; streamed chunks are collected as Buffers with a finite 1,048,576-byte stable cap before the audited runtime cap

### Activation and scope boundary

- production construction point supplies no `bridgeRuntimeFactory`
- the semantic diff adds no production factory, adapter, DB gateway, provider value, network call, Supabase migration, dependency, `.env` value, deployment configuration, secret, or credential
- only two bridge capability environment names are introduced; absent values default off
- runtime activation, database/provider contact, and external data use: `0`

## Proportional verification

- focused bridge/account/stable matrix: `113/113` PASS
- full frontend: `89/89` PASS across 5 files
- full Node: `229/229` PASS
- production build: PASS, `1,652` modules transformed
- security suite: `37/37` PASS
- public-mode suite: `4/4` PASS
- stable snapshot: 2 projects, prohibited disclosures `0`, Gate evidence fields `0`
- client environment boundary: Git metadata leaks `0`; sealed payload leaks `0/6`
- scope: PASS, 47 product/runtime/test files
- runbook: PASS
- local public API/HTML/bundle/rendered-UI prohibited identifiers: `0`
- Builder Gate ledger structural check: `9/9` met, but W6's existing cases do not cover the dot-segment alias and therefore do not establish the exact-path acceptance requirement
- adversarial alias probe: 5 raw unknown aliases checked; 3 rejected and 2 dot-segment aliases incorrectly accepted
- adversarial parser probe: 3 malformed classes checked; `3/3` rejected before bridge mutation

No candidate product, test, Gate, migration, environment, or deployment file was changed by QA. The only candidate child change is this report.

## Gate truth and authority boundary

- O2: `OPEN/LOCKED`
- Phase 3: `17/43`, unchanged
- `EXTERNAL_OUTCOME_COMPLETE=false`
- hosted persistence adapter: OPEN
- Supabase migration/application and hosted resource wiring: OPEN
- corrected-candidate fresh QA: OPEN
- Release Audit: OPEN and not authorized by this FAIL
- Cherry acceptance: OPEN
- deploy, push, release, and external completion: OPEN
- false-completion controls independently preserved: `6/6`

## Mutation ledger

- external messages: 0
- network calls: 0
- provider/account/project/billing operations: 0
- database connections, queries, migrations, or data writes: 0
- credential, secret, or environment mutations: 0
- browser, device, or session operations: 0
- push, deploy, release, or public message mutations: 0
- external mutations: 0

## Rollback and next transition

The candidate remains unpromoted because QF-1 blocks independent QA. No external rollback is required because external mutations and runtime activation are both zero. Builder should create a minimal correction child of the authorized candidate, retain every other passing boundary, and return a new immutable receipt for fresh independent QA. Release Audit, Cherry acceptance, O2, deployment, release, and external completion must remain open.
