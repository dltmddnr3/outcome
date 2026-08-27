# OUTCOME Phase 3 · Observer Bridge Hosted H1-H2 Correction Fresh QA

Status: **PASS_INDEPENDENT_QA_ONLY / H3-H4 CODE WORK ELIGIBLE / HOSTED EXECUTION AND O2 LOCKED**

Observed: 2026-08-27 KST

## Immutable candidate verification

- candidate commit: `918b797e47e57267a0e460a392908d2a1bdb3530`
- candidate tree: `6d101be505984efa439b27f413d5ef337dce17b9`
- direct parent and prior FAIL report commit: `fab37c3155080a37ed91916061665b4791d4fa24`
- candidate subject: `fix: harden hosted observer bridge isolation`
- exact changed paths: `5`
  - `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H1_H2_CORRECTION_RECEIPT.md`
  - `server/phase3-observer-bridge-api.mjs`
  - `server/phase3-observer-bridge-api.test.mjs`
  - `server/phase3-observer-bridge-hosted.mjs`
  - `server/phase3-observer-bridge-hosted.test.mjs`
- SHA-256, in the same order:
  - `18d7fab73de7cd8a4c415f54cbbedebe740b9c69fab0ef6c5442ce28eb9d2a1b`
  - `e7ae392b322791c273e7ed250aee40e6e23271858f52de49d63818cd7599884f`
  - `14f5324874b0f4a7e48241139aae35cbb40314ee4a283f068853a311d0d85aa7`
  - `884fdc2b345fb933e18e028d12399e5751712efb154ae2a4e7a449ed8078c8e9`
  - `8891060cb2943a2727dec2a8b5a795dc11d52caa8af48fada4b2064e5bcf0754`

The commit, tree, parent, five-path boundary and hashes matched the QA dispatch in a fresh detached worktree. The local and hosted architectures, hosted Builder brief, prior `FAIL` report, correction receipt, all four H1-H2 source/test files and the reused domain source/tests were read directly. Builder statements were treated as hypotheses. No `SAFE_HOLD` identity or scope mismatch occurred.

## Verdict

`PASS_INDEPENDENT_QA_ONLY`

All six prior findings were independently refuted against the immutable correction candidate. The final fresh hostile probe passed `6/6`; the focused correction suite passed `28/28`; the domain suite passed `17/17`; and proportional repository regressions passed. Adjacent scope keys, raw parsing, semantic fingerprints, source selection, trusted-context separation, atomicity, privacy and non-authority boundaries showed no blocking regression.

This PASS makes only ordinary local H3/H4 code planning and separately authorized implementation eligible. It is not an H3 PostgreSQL/RLS result, H4 operations result, hosted/account preview, deployment authority, O2 proof, progress, Gate closure, Release Audit, Cherry acceptance, release or external completion.

## Independent F1-F6 results

### F1 · workspace isolation · PASS

- H1 and H2 were exercised with `workspace_main` and `workspace_other` sharing `project_id=outcome`.
- Binding keys include workspace/project/role/binding/source; viewer registrations include workspace; idempotency keys include account/workspace; replay keys include workspace plus the full binding and certificate/request/nonce scope.
- Viewer lookup and active-source selection both require the server-authorized workspace and project.
- The other-workspace H1 read returned `access_denied`; H2 returned exactly `404 {"error":"bridge_unavailable"}`.
- Unauthorized project/source/workspace/role/status presence values: `0`; failed-read store/replay/revision consumption: `0`.

### F2 · own-data and prototype-safe authority · PASS

- Direct H1 hostile auth cases: `7` — inherited token, JSON-own `__proto__`, JSON-own `constructor`, accessor, Proxy, null-prototype missing token and null-prototype own wrong token.
- H2 raw/parser hostile cases: `6` — top-level `__proto__`, `constructor`, `prototype`, nested pollution, accessor object and Proxy object.
- JSON data is rebuilt into null-prototype records with descriptor-safe definitions; pollution and duplicate keys are rejected. H1 accepts only an own enumerable data `token`; inherited/accessor/Proxy authority never reaches authorization.
- `authContext` remains a separate server argument. Client `auth_context` in raw JSON cannot replace it.
- inherited/client-supplied authority acceptances: `0`; accessor/Proxy trap or getter hits: `0`; hostile-case authorization calls before structural rejection: `0`; store/entropy/state consumption: `0`.

### F3 · actual raw UTF-8 byte cap · PASS

- Enrollment exact maximum / maximum-plus-one: `175/176` UTF-8 bytes.
- Companion ingest exact maximum / maximum-plus-one: `608/609` UTF-8 bytes.
- Rejected oversized representations: exact `+1`, `1,000`-byte whitespace padding, multibyte overflow and ingest `+1`; oversized acceptances: `0`.
- Malformed JSON, duplicate keys, nested pollution and invalid UTF-8 were rejected before authorization or store access.
- The oversized ingest was rejected before hosted crypto, rate, replay, domain or store activity; the same exact compact request then succeeded, proving no rate/replay consumption by the rejected attempt.
- pre-boundary auth/crypto/store/replay/rate/domain state hits: `0`.

### F4 · append-only rotation continuity · PASS

- Projection ledger revisions were `1 → 2 → 3` across accepted event, key rotation and explicit resync.
- Accepted counts were `1 → 1 → 2`; rotation did not erase accepted history.
- The rotation projection was explicitly `status_code=null`, `freshness_class=unknown` until the new-key sequence-`2` resync.
- The resumed projection reported `테스트 실행 중` and remained monotonic.
- Workstation and remote-device responses were deep-equal both immediately after rotation and after resync.

### F5 · exact challenge expiry interval · PASS

- The interval is `[issued_at, expires_at)`.
- `T+299,999ms`: accepted.
- `T+300,000ms`: `enrollment_invalid`.
- `T+300,001ms`: `enrollment_invalid`.
- Both denied boundary attempts consumed `0` additional entropy calls, store commits, source/certificate IDs or published state.

### F6 · semantic fixed-order idempotency · PASS

- Equivalent H1 objects in original order, reverse property order and null-prototype own-data form returned the first immutable challenge response.
- Equivalent H2 JSON texts with opposite member order returned the same immutable response.
- A changed role/source semantic scope returned `idempotency_conflict`.
- Equivalent and conflicting retries created `0` new challenges, entropy-derived IDs or store commits. The fixed fingerprint covers server-derived account/workspace plus project/role/binding/source/mode in one pinned order.

## Adjacent boundary and privacy review

- No project-only select-first fallback remains; active source resolution is workspace plus project scoped.
- Raw bytes are measured before parse, and JSON is parsed internally rather than reserialized for the size decision.
- Duplicate and pollution keys are rejected recursively; client-declared `body_bytes` and `auth_context` are rejected.
- H1 input/config/auth records accept ordinary or null prototypes only, exact own enumerable data descriptors and exact allowlisted keys.
- Transaction drafts publish only after independent response materialization and successful store commit. Focused clone, clock, crypto, reentry, auth-outage and store-failure tests remained atomic.
- Serialized focused projections prohibited prompt/result/session/thread/turn/credential/private-key/signature/certificate/progress/Gate/approval/completion hits: `0`.
- Progress, Gate, QA, Audit, approval or completion-authority grants: `0`.
- Candidate H1-H2 HTTP listener, network, Clerk, Supabase, PostgreSQL or provider integration hits: `0`.
- H3 PostgreSQL adapter/test and H4 operations adapter/test paths: `0`.

## Fresh probe and regression execution

| Command | Exact result |
| --- | --- |
| `node --test server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs` | `28/28 PASS` |
| `node --test server/phase3-observer-bridge.test.mjs` | `17/17 PASS` |
| fresh independent temporary hostile probe | final `6/6 PASS`; F1-F6 secure expectations `6/6` |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | PASS; local mutations `32/32=405`; API `read_only` JSON `28/28`; empty page bodies `0/4` |
| `npm run test:security` | `29/29 PASS`; stable prohibited disclosures `0`; Gate evidence fields `0`; client payload leaks `0/6` |
| `npm test` | frontend `89/89` plus Node `189/189`, total `278/278 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `217/217 PASS` |
| `npm run build` | PASS; `1652` modules; `index-DgbgRsT8.js`, `index-R1nuadtV.css` |
| `npm run check:scope` | PASS; `41` product/runtime/test files |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

The independent probe was calibrated without changing the candidate: its first two temporary harness runs exposed QA-script mistakes in the injected Node verifier signature and counter expectations (`0/7`, then `5/7`), not candidate failures. After correcting only the temporary probe outside the repository, the final unchanged candidate passed `6/6`. This history is recorded so no preliminary execution is presented as product evidence.

### Builder receipt evidence correction

The correction receipt records the mutation output as `empty page boundary 4/4`. Exact rerun at this candidate printed `empty page boundary=0/4`. The command still passed because each of the four non-API page mutations returned the other allowed form, canonical `read_only` JSON, rather than an empty body. This is a non-blocking receipt-count correction and not an H1/H2 behavior, authorization or privacy defect. This report uses the measured `0/4` value.

No check was unavailable. No dependency was installed. The canonical workspace's existing dependency directory was attached through one temporary symlink and removed before commit.

## Operation ledger and residual boundary

- fresh isolated worktrees: `1`
- temporary QA files outside the repository: `2` (gate ledger and hostile probe)
- temporary hostile-probe executions: `3` (`0/7` harness-invalid, `5/7` harness-invalid, final `6/6 PASS`)
- temporary dependency symlink attach/remove: `1/1`
- candidate source/test mutations by QA: `0`
- repository mutations: exactly this QA report and its single commit
- dependency installs: `0`
- actual external database/RLS/migration operations: `0` (repository tests used local synthetic fixtures only)
- actual provider/account/session/browser/device/companion/private-store/credential operations: `0`
- bridge runtime HTTP listeners and external network operations: `0` (required repository regressions used only their local ephemeral test harnesses)
- environment/config/secret mutations: `0`
- push/deploy/release/external messages: `0`
- canonical integration and Contract/Map/Gate/progress mutations: `0`

H3 PostgreSQL/RLS/migrations, H4 hosted operations/persistence/retention/backup/restore, actual account authentication, a real companion, hosted resources and a real two-viewer O2 proof remain absent and locked. Any next Builder slice requires a new exact pin, allowed paths and Gate.

This report's own commit, tree and SHA-256 are measured after its single-file commit and returned outside the file to avoid a circular identity.

## ABANDON

**ABANDON:** this `PASS_INDEPENDENT_QA_ONLY` proves only the ordinary local H1-H2 correction at candidate `918b797e47e57267a0e460a392908d2a1bdb3530`. It enables H3/H4 code planning and separately authorized implementation only. It grants no hosted preview, provider/database/resource action, O2 proof, progress, Routing T1-T7, Evidence E1-E6, Release Audit, Cherry acceptance, deployment, release or external completion.
