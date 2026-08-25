# Phase 2 Account Access Fresh Release Audit

Date: 2026-08-25 KST

Role: new independent OUTCOME-native Release Auditor, separate from Builder, Parent, and both UX/Product QA reviewers

Authority: release audit only; no Cherry acceptance, provider/resource mutation, deploy, push, release approval, Phase 2 completion, or external completion

## Terminal decision

The exact disabled provider-neutral candidate is reproducible, byte-identical to the public deployment, fail-closed on every public/private mutation and unauthenticated private read, and green across the account, frontend, Node, security, build, account-browser, stable-browser, portfolio-browser, and remote-browser suites. The real local PGlite/PostgreSQL migration and RLS denial matrix also pass.

The audit cannot close because the required canonical generic browser regression is not runnable from the immutable candidate's default registry. `npm run test:browser` passes its 16 assertion tests, but its runtime check times out waiting for `.oc-dashboard`: `config/outcome-projects.json` resolves Cherry Note from `../Cherry Note`, while that registered source has neither the expected root-level `OUTCOME_CONTRACT.md` nor `OUTCOME_MAP.md`. The Package loader returns the first project as `unknown` with missing-contract/map errors and fails closed. Replacing the source with the repository-contained three-project fixture makes the same four-viewport runtime pass, but synthetic fixture success does not convert the unavailable canonical probe to PASS.

Per the audit rule that an unavailable probe is BLOCKED rather than inferred PASS, A1-A4 remain unclosed and Cherry acceptance is not opened.

## Immutable boundary

- Candidate commit: `70a86ea5f7bdd9c78e27efa1d623a140568c31ff`
- Tree: `1d5649199bb0037f6933dcd351f3f700cf055a43`
- Parent: `ee490c631a889464503202da67dda2ab30a249f1`
- Ref: local `HEAD`, fetched `origin/main`, remote `refs/heads/main`, and candidate are identical.
- Subject: `docs: route standalone account release audit`
- Parent-to-candidate inventory: modified `GATES_PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT.md`, added `docs/PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT_HANDOFF.md`, modified `docs/PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT_PREFLIGHT.md`; no product/runtime/migration change.
- Fresh detached worktree: isolated temporary checkout; no Builder or UX/Product QA worktree reused.
- Public URL: `https://outcome-five.vercel.app`
- Public receipt: commit `70a86ea5f7bd`, tree `1d5649199bb0`, ref `main`, asset `index-fGSYVODK.js`, `runtimeNowPinned=false`.
- Upstream re-QA report SHA-256: `e997efc96ac5c204fb8c0a922c4887bda0204011ec61ce2105bd296cd7566225`; terminal authority remains UX/Product QA only.
- Migration SHA-256: `832e8fc117d7c5b1b403cbe8f4e34ca3f4ceeb3f23904c82daefd56b96cae5a7`.
- Synthetic fixture SHA-256: `6d27b23601739071bd60f78cc3caa84ed988742e5b0e21c1fe29fad0893d8522`.

## Build and served-byte parity

Two fresh candidate builds produced `index-fGSYVODK.js` and finalized the expected commit/tree receipt. Local and public bytes are exact:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 448 | `6c00bd19ad56c671b26709cd9502a1dcb397baaf0ee7c9cab18440d02739a216` |
| `index-fGSYVODK.js` | 255,466 | `a349ed3befb0a967d6ae981f979f2e4061610b5cdc63f5618bac670f502cb637` |
| `index-t6iIeZVW.css` | 70,742 | `bcfa43ea4e39a3a061c17776716207183914b6b01f30e03b58fb56f930d5f76c` |

The public dashboard returns two projects, marks account implementation 8/8 and UX/Product QA 4/4, marks Release Audit active 0/4 and Cherry acceptance locked 0/4, and pins `deployment_snapshot` with `liveSessionRelay=false`. Raw `gate.gates[*].evidence` fields, UUIDs, full hashes, local paths, task/turn/thread/session identifiers, and credentials are absent. The 25 Stage evidence-axis values remain as required semantic status rather than raw Gate evidence.

Public headers include HSTS, `nosniff`, frame denial, no-referrer, and a restrictive permissions policy. HTML, JS, CSS, API payload, and rendered UI disclosure checks found zero prohibited identifiers.

## Public/runtime matrix

| Probe | Observed |
| --- | --- |
| `GET /api/health` | 200, `available / public_read_only / deployment_snapshot` |
| `GET /api/dashboard` | 200, 86,827 bytes, exact receipt and two-project sanitized projection |
| `GET /api/private/config` | 200, `enabled=false`, private read-only, Google primary, Apple linked-only, email-code recovery, seven-day maximum, completion authority false |
| `GET /api/private/workspace` | 401 `authentication_required` |
| `GET /workspace` and `/cherry-note-dashboard` | 200, exact 448-byte HTML |
| unknown API GET | 404 `not_found` |
| local mutation matrix | 32/32 exact 405; API canonical `read_only` JSON 28/28 |
| public mutation matrix | 32/32 exact 405; API canonical `read_only` JSON 28/28; page bodies empty 4/4 |

The fixed public deployment is a sanitized snapshot, not a live private service, provider callback runtime, durable account database, session relay, mutation surface, or completion authority.

## Authentication, authorization, CSRF, and privacy

- Provider-neutral service tests cover anonymous, invalid, wrong-owner, expired, revoked, stale membership, duplicate membership, forged project, cross-workspace binding, unregistered project, provider outage, Apple-link, logout, and operator-revocation denial/transitions.
- Server-derived identity and membership select only Cherry Note and OUTCOME. Client workspace selectors do not grant authority.
- The default and public login/logout transition routes return canonical 405. A transition can exist only when both account service and an explicit synthetic adapter are injected.
- Synthetic transition cookies are `HttpOnly` and `SameSite=Strict`, hide the token from the response body, and add `Secure` when production cookie mode is selected.
- The injected synthetic transition route has no explicit Origin/CSRF-token check and uses Strict rather than the approved real-provider Lax architecture. This does not expose the audited public candidate because its config is disabled and no adapter/provider exists, but it is a hard blocker before any real provider adapter or private-surface enablement.
- Secrets are named runtime contracts only. Scans found no provider secret, owner identifier, email, token, credential, local path, raw session identifier, or raw Gate evidence in Git-controlled runtime defaults, public bytes, API, or rendered UI.

## PostgreSQL/RLS and data lifecycle

The exact migration executed unchanged in `@electric-sql/pglite` 0.5.7 on PostgreSQL 18.3. It created eight forced-RLS tables, used actual `authenticated` and `anon` roles, and proved:

- one canonical identity cannot be inserted into a second workspace;
- the owner sees exactly one row from each of workspaces, memberships, projects, bindings, snapshots, and receipts;
- unknown and revoked identities see zero rows;
- anonymous reads and authenticated writes are denied;
- cross-workspace project, binding, snapshot, and receipt visibility is denied.

The in-memory contract proves valid append-only insertion, current-pointer movement only after validation, invalid-ingest pointer preservation, session activity not changing evidence time, redacted JSON export, immediate access revocation, and a 30-day deletion ledger. The SQL pins immutable receipts and deletion-ledger fields.

The 90/365-day purge schedule, hard-delete worker, restored-backup deletion-ledger replay, RPO/RTO measurement, and isolated hosted restore are contract-only in this candidate. They are not real hosted evidence. Because no hosted database or private data exists and the audited deployment keeps private access disabled, their absence is residual deferred proof rather than evidence of a broken disabled release. It becomes blocking before provider/database preview promotion or private enablement.

Synthetic data remained in process memory/PGlite only; both close at test completion. No provider, Supabase, database, secret, domain, or production data was created or mutated.

## Operations, cost, incident, rollout, and rollback

Local tests reproduce 120 private requests per 10 minutes per source, 6 sync attempts per project/hour, idempotency-key duplicate rejection, same-project concurrency rejection, a 512 KiB payload ceiling, cost states at USD 40/60/75, redacted incident receipts, required metric/SEV1/SEV2 vocabularies, and a rollback binding that disables private access and selects a named last-verified deployment.

These controls are provider-neutral code/contract evidence. No hosted Vercel WAF rule, provider telemetry, alert delivery, Supabase backup, cost-spend action, or real incident notification exists. They are not required to keep this exact disabled snapshot fail-closed, but all are blocking before private-surface enablement and cannot be promoted as hosted operational proof.

Rollback was verified without switching public production. The last independently evidenced public UX candidate `eb0ce1064043a38021003c689d7685ae0d9dc6d9`, tree `ddc6f080790256c21c31bd2a000603dbcf013b94`, rebuilt successfully with stable-host 8/8. Its HTML/JS/CSS hashes exactly match the audited public bytes while its generated deployment receipt correctly re-pins the older commit/tree. Since the audited candidate changes only audit-routing documents and creates no provider/database state, rollback requires deployment selection only; no data reversal is implied.

## Regression and accessibility evidence

| Command/probe | Result |
| --- | --- |
| `npm run test:account-access` | PASS: Node 18/18, UI 5/5 |
| `npm test` | PASS: frontend 64/64, Node 97/97 |
| `npm run test:security` | PASS: 28/28; prohibited disclosures 0; raw Gate evidence fields 0 |
| `npm run build:vercel` | PASS twice; stable-host 8/8 each build |
| `npm run build:isolated` | PASS; exact asset names and bytes |
| `npm run test:account-access-browser` | PASS: 3 viewports, 9 settled states plus loading and ready login/logout hierarchy; both mobile widths at 200% zoom overflow 0 |
| `npm run test:stable-browser` | PASS: 4 viewports, 2 projects, 48 hierarchy selections and 25 Stage selections per viewport |
| `npm run test:portfolio-browser` | PASS: 3 isolated projects at desktop/mobile |
| `npm run test:remote-browser` | PASS: public desktop/mobile, 48 hierarchy selections and 25 Stage selections per viewport |
| `npm run test:browser` assertion half | PASS: 16/16 |
| `npm run test:browser` default runtime half | BLOCKED: canonical external Package source unavailable; `.oc-dashboard` timeout |
| `npm run test:browser` with repository-contained fixture registry | PASS: 4 viewports, 3 projects, 9 hierarchy selections and 3 Stage selections per viewport |
| public/local redaction and mutation checks | PASS: prohibited identifiers 0; both mutation matrices 32/32 exact 405 |
| scope/runbook checks | PASS |

Across account/stable/portfolio/remote/fixture browser runs: controls are at least 44 px; leaf text is at least 11 px; text contrast is at least 4.5:1; focus contrast is at least 13.60:1 where measured; reduced-motion animation count is 0; document overflow, viewport escape, clipping, ellipsis, role intersections, status overflow, translation fallback, and unexpected English are 0. Current-versus-selected truth and keyboard/touch navigation remain intact.

## Blocking item and residual debt

### B1 · Canonical generic browser source unavailable — release-audit blocking

Reproduction:

1. Use a fresh detached checkout of the exact candidate.
2. Build the isolated candidate.
3. Run `npm run test:browser` with its default committed registry.
4. Observe the assertion tests pass, then the browser runtime time out waiting for `.oc-dashboard`.
5. Directly collect the default registry and observe Cherry Note as `unknown` with missing contract/map errors.

Expected: the exact candidate's default registered Package sources are available and the four-view generic browser regression completes.

Actual: the registered external root does not contain the expected contract/map, so the server fails closed and the canonical browser regression is unavailable.

Owner: Package/source registry owner. Repair must produce a separately reviewed immutable source binding or a worktree-contained canonical snapshot; this auditor does not mutate the registry or external project.

Non-blocking only for the current disabled snapshot, but blocking before any later private enablement: real Clerk/OAuth/callback/account-link proof; explicit Origin/CSRF for transitions; hosted Supabase migration/RLS; purge/restore rehearsal; WAF/alert/cost delivery; backup evidence; provider cookie compatibility; and rollback with actual private resources. These are not presented as PASS.

No product, Gate, Map, snapshot, provider, secret, database, domain, deploy, remote ref, or roadmap file was changed by this audit. The only committed artifact is this report.

BLOCKED
