# OUTCOME Phase 4 · Session Workspace Contract

Updated: 2026-09-08 KST
Status: **Cherry-approved product direction · partial implementation · full actual-use acceptance open**

## 2026-09-08 · Single-session Observer amendment

Cherry requested review and reapplication of Observer for the current one-session implementation → QA verification → Release verification workflow. This section takes precedence over the legacy role-per-session wording below for the current Phase 1–5 MVP. It does not close a Gate or declare the Observer deployed.

### Work ownership and observation unit

2026-09-09 continuation clarification: this same-session amendment and Cherry's current instructions remain the operating authority. The historical O1 package pins AGENTS.md bytes; do not rewrite that evidence carrier merely to synchronize instructions. Commit 71ac2e6's task-owned AGENTS addition caused source_digest_drift and is rolled back without changing the pinned projection hashes or weakening tests. Goal UI editing and locating an old role ticket are not prerequisites for the already-approved local work. This does not manufacture runtime execution grants or authorize live activation.

Regression resolution at 6921c3a: all seven pinned source classes were checked; only agents differed before correction. AGENTS.md is restored to its accepted bytes. Before committing, the HEAD-bound test still rejected the prior HEAD as expected; after commit O1 suite 10/10 PASS, full npm test 884/884 PASS (0 skip/TODO), npm run build PASS. The earlier four failures are attributable to 71ac2e6, not waived baseline debt. This closes that regression classification only, not live-stage execution, Release acceptance or Phase 4/5 completion. No test or pinned hash was changed. Task-owned removal is recoverable from 71ac2e6; unrelated dirty documents remain untouched.

- Primary unit: one outcome-linked work item and its current run, not a role slot or a desired session count. Each work item binds one Milestone/Acceptance Predicate and exactly one active execution session.
- `implementing`, `qa_verifying`, and `release_verifying` are stages within that same session. A stage switch creates neither a new session nor a new role binding. The Planner composer remains the single owner communication channel.
- If multiple independent work items are later explicitly enabled, each session owns its own complete implementation–QA–Release loop. Dependencies and overlapping write scopes prevent concurrent conflicting runs; four occupied slots is not a success condition.
- Same-session QA and Release evidence is labeled `same-session verification`. It is never displayed as independent QA/Audit. A Predicate explicitly requiring independent evidence remains unmet until separately satisfied or explicitly amended by Cherry.
- Preserve legacy role bindings and receipts as compatibility history. Do not migrate the protected registry or reinterpret prior independent receipts merely because this contract changes.

### Observer is code, not an extra conversational session

| Component | Owns | Must not do |
| --- | --- | --- |
| Source adapter | Authenticated current-session events, exact sequence and immutable artifact references | Infer execution from an open tab, old binding, process port or a plan |
| Observer | Durable observation cursor, current stage/activity/freshness, completion-without-next-action and stalled-run signals | Dispatch, grant authority, accept a candidate or change progress |
| Execution controller | One claimed eligible next action under the current work item, authority and dependency version | Fill empty slots, repeat ambiguous sends, invent tasks or extend authority |
| Evidence verifier | Resolve stage terminal evidence to exact candidate/tree and required checks | Treat a final chat response or test count as stage acceptance |
| Planner interface | One ordered work timeline, next action and owner decision entry | Present role filters as separate required sessions |

These are program responsibilities, not new agents, schedules or products. The current chat relay is transport only: its dispatch/response polling status is not proof of a product stage or of automatic next-work execution. Existing signed Observer Bridge privacy, authentication, sequence and freshness controls remain reusable transport boundaries; its legacy role field must not be overloaded with a stage without an explicit versioned adapter.

### Stage and continuation rules

1. `queued → implementing`: current authorized request, dependencies satisfied, exact source/write scope and exclusive run ownership verified; require actual start evidence before displaying running.
2. `implementing → qa_verifying`: pinned candidate/tree and implementation receipt exist; QA checks the same candidate. A chat turn ending alone leaves stage evidence pending.
3. `qa_verifying → release_verifying`: required QA evidence passes for the exact candidate; failed QA returns one bounded correction to implementation. A new candidate invalidates downstream QA/Release evidence.
4. `release_verifying → awaiting_owner`: candidate, privacy, rollback and allowed Preview checks pass. `awaiting_owner` is neither release nor Cherry acceptance. Separately approved deployment is a controller action, not an implied effect of PASS.
5. After any terminal stage event, the controller records either one next eligible action or a finite blocker (`needs_owner`, `dependency_blocked`, `authority_missing`, `evidence_missing`, `delivery_unknown`). Observer flags a terminal-without-next-action discrepancy; it does not repair it by sending a duplicate.
6. Stable work/run/stage/attempt identity and a durable CAS claim precede dispatch. Acknowledgement/start readback is required. Timeout after dispatch is `delivery_unknown`; reconcile the original action, never automatically replay it. Resume after a crash reconciles the same durable claim before new work.
7. Offline requests remain server-queued, per Cherry's adopted choice. Reconnection executes only after the existing authority and deduplication checks; it does not introduce a cloud executor. Destination edits form a separately reviewed version while unaffected existing approved work remains valid. Conflicts or revoked approval stop affected work.

### Freshness, UI and authority

- Keep three axes separate: execution stage, process/activity observation, and validated result progress. Message volume, elapsed time, stage position and occupied sessions never increase completion percentage.
- The work card shows current stage, actual observed activity, last observation age, current immutable candidate evidence, next action or blocker, and verification mode. Private session IDs/paths/credentials are not rendered.
- A single-session work card replaces the old 4/4 role occupancy target. Technical role/stage filters remain optional read-only lenses over the same ordered work dataset.
- Prefer provider events; where unsupported, use bounded read-only polling with backoff. A missed freshness deadline means `observation_stale`/unknown, not proven stopped or failed. Proven terminal events are distinct from transport loss. No unconditional timer-driven task dispatch.
- Source heartbeat loss, lease occupancy and API send readiness must not be presented as model execution evidence. An observer callback failure cannot cause another message dispatch or mark a result complete.
- Notify on a meaningful change, required owner action, confirmed failure or completion-without-next-action; unchanged healthy observations stay quiet. No scheduled agent heartbeat is installed by this contract.

### Existing Phase 4 acceptance additions

- [x] Local source composition joins the current authenticated binding, durable journal and owner-runtime snapshot; changed binding or cancellation returns unavailable, never a fabricated running state.
  CHECK: node --test server/outcome-local-work-source.test.mjs
  EXPECT: fail 0
  EVIDENCE: 20f53a3 same-session verification: targeted observation suites 13 PASS; full npm test 893 PASS (0 fail/skip/TODO), npm run build PASS. Composition rejects changed/foreign binding, wrong runtime identity, future observation, malformed journal and cancellation; retains original observation age and strips private identity at the public projection boundary. Local source factory only: no live resolver/journal/desktop-reader wiring or hosted transport activated. Actual owner-use remains OPEN. Rollback task-owned source/test commit; unrelated dirty docs preserved.

- [x] Screen observation accepts the local journal's domain-separated opaque session reference only when it matches the observed private thread; legacy UUID compatibility remains exact and no identifier is exposed.
  CHECK: node --test server/outcome-codex-work-observation.test.mjs server/outcome-work-observation-access.test.mjs
  EXPECT: fail 0
  EVIDENCE: Same-session regression reproduced unknown instead of active before correction; targeted observation/access suites 11 PASS after correction. Foreign/plain-hash/uppercase references and a hash masquerading as provider UUID reject; output excludes identifiers. Hosted source injection and actual owner use remain separate open requirements; this correction does not activate a source. Rollback only this task-owned projector/test change.

#### Candidate-bound stage receipt check · 2026-09-09

- [x] Explicit one-shot session input can authenticate local execution without creating a token file; bounded input errors fail closed and do not print token bytes. Integration only, not a live sign-in.
  CHECK: node --test server/outcome-work-runner.test.mjs
  EXPECT: fail 0
  EVIDENCE: 48d36aa full npm test 890 PASS. Explicit --session-stdin plus schema-v4 configuration omits tokenPath, takes one bounded in-memory stream, and reuses the current account verifier on each authority check. Empty/oversized/whitespace/invalid-UTF8 input and timeout reject generically; the full fixture stage chain creates no token file. Existing v1-v3 token-file compatibility is retained, not default permission to create new secret storage. Read-only inspection of 13 small top-level canonical runtime JSON files found no matching work-runner configuration (not an exhaustive machine-wide claim). No live credentials/configuration, grant or runtime initialization created. Scope runner/tests; rollback task-owned commits. Live owner authentication and operating configuration remain open.

- [ ] Stage terminal publication requires a recorded start, completed correlated provider observation, current unrevoked grant and protected passing receipt for the same work; publication records one next action but never dispatches or accepts automatically.
  CHECK: node --test server/outcome-work-runner.test.mjs
  EXPECT: fail 0
  EVIDENCE: Partial at e8c48d4, full npm test 888 PASS. Schema-v3 --finalize composes current owner/binding, original grant, recorded start, completed observation and protected passing receipt; writes terminal event plus nextAction exactly once without dispatch. Initial implementing same-candidate fixture passes; running observation and writable receipt reject. Git output guard checks ancestry, intermediate/merged and net changed paths for a new implementing candidate; QA/Release require exact source candidate. Gate remains OPEN: descendant/merge hostile cases, end-to-end QA→Release→owner chain and real owner execution are not yet proven. Scope journal/one-shot runner/tests. No live publication, activation or release; rollback task-owned commits only.

  FOLLOW-UP EVIDENCE: 7bdf0af full npm test 888 PASS. Real local SQLite/files/CLI composition with fixture identity and provider now traverses implementing→QA→Release with one candidate, three explicit fixture approvals, three dispatches, seven stage events, duplicate-terminal readback and final needs_owner without a fourth dispatch. Missing per-stage approval or wrong prior receipt prevents dispatch. RED at 7347247 exposed needs_owner being collapsed to configuration_hold; corrected without granting acceptance. This proves the bounded CLI chain, not automatic policy generation, genuine model execution or owner dogfood. Descendant/merge hostile cases and real execution remain OPEN.

  OUTPUT-SCOPE EVIDENCE: 32da9b2 full npm test 889 PASS. The runner's Git output check is extracted into outcome-work-output-candidate.mjs for real temporary-repository testing: approved descendant allowed; forbidden change then revert, merge carrying forbidden change, unrelated root, wrong tree, QA/Release candidate change and traversal path rejected. Additional RED showed refs/replace could make an unrelated commit appear eligible. 1c43a67 forces original Git objects with GIT_NO_REPLACE_OBJECTS; hostile test and all 54 work tests PASS. No existing repository refs or user files changed by fixtures. This closes the descendant/merge test gap, not runtime write confinement or actual owner execution. Overall live terminal publication Gate remains OPEN.

- [x] A running observation for an exact claimed reservation records the stage start once; terminal-only observation cannot synthesize a missed start or stage acceptance. Tested integration, not live owner use.
  CHECK: node --test server/outcome-work-runner.test.mjs server/outcome-work-journal.test.mjs
  EXPECT: fail 0
  EVIDENCE: c7f5c45 full npm test 888 PASS, 0 FAIL/skip/TODO. --observe persists activity then atomically records one start event and its source digest against the claimed reservation. Existing start survives replay without another event. Tests cover initial implementing and implementing-to-QA same-candidate start; missing claim and terminal-only evidence cannot create a start. Terminal activity alone leaves nextAction null and creates no passing receipt. New starts table is required at CLI preflight; no existing live DB auto-migrated. Scope local journal/runner/tests; no live schema migration, provider execution or activation. Same-session observation is not independent QA. Validated terminal receipt publication and continuous next-stage routing remain open.

- [x] Claimed reservation activity is collected through the exact dispatched envelope and persisted separately from stage acceptance, with replay and terminal-regression protection. Integration proof only, not live operation.
  CHECK: node --test server/outcome-work-runner.test.mjs server/outcome-work-queue.test.mjs
  EXPECT: fail 0
  EVIDENCE: 4f41669 full npm test 887 PASS. Additional hostile cases at 7480cb2 targeted runner tests 2 PASS. --observe resolves current authenticated owner/binding, exact claimed reservation and same deterministic message used for dispatch, then stores bounded activity only. No unclaimed observation, private extras, future timestamps, changed turn identity or terminal-to-running regression accepted. Same source replay leaves original observation time intact; no stage journal sequence or acceptance advance. Activity table is latest-observation storage, not complete event history. Source adapter is real implementation; identity/provider observations are fixtures in this test. No runtime migration or live observation occurred; existing local stores without the new table hold rather than auto-upgrade. Scope local journal/queue/one-shot runner/tests; rollback task-owned commits. Actual authorized execution, stage receipt publication and next-stage transition remain open.

- [x] Correlated provider activity distinguishes observed running/terminal from missing/unknown without exposing private text or granting stage acceptance. Adapter implementation only; no claim of live observation.
  CHECK: node --test server/outcome-chat-result-source.test.mjs server/outcome-chat-codex-queue.test.mjs
  EXPECT: fail 0
  EVIDENCE: ebe7cd2 full npm test 887 PASS, 0 FAIL/skip/TODO. Existing read-only bound thread reader now exposes a separate activity projector: exact correlated full turn, unique user envelope, validated terminal timestamp and provider status; missing is pending, malformed/ambiguous is unavailable. Returns only opaque digests/status/times, no private text/IDs, and false completion/execution authority. Queue tests prove reads do not dispatch and forged destinations fail. Scope existing source projector and queue reader. Actual stage journal publication still requires the approved reservation and validated stage receipt; model turn completion alone cannot close QA or Release. No live provider observation, start/terminal persistence or runtime activation occurred in this test turn.

- [x] One-shot CLI issues only an explicit digest-confirmed V2 execution plan for the authenticated current owner and exact policy/binding/candidate; rejected or mismatched requests do not create approval. This is tested issuance, not a live owner grant.
  CHECK: node --test server/outcome-work-runner.test.mjs
  EXPECT: fail 0
  EVIDENCE: f339633 full npm test 886 PASS, 0 FAIL/skip/TODO. Protected schema-v2 configuration adds approvalPath; --approve requires the exact plan SHA argument, current owner authentication twice, exact current binding/policy/candidate, V2 grant verification, durable record and readback. Fixture integration proves no preapproval dispatch, no record for wrong digest/owner/binding, one approved dispatch, repeated claim safety and no resurrection after revocation. Preflight has a five-second timeout; timed-out inspection cannot later write. --approve is an explicit owner action, never inferred from ordinary decision cards. No live grant or credential was created, no stage command executed and no new schedule or deployment. Scope runner and tests; rollback task-owned candidate only. Actual owner approval UX, execution-start/terminal collection and continuous stage advancement remain unmet.

- [x] Existing local runtime has a one-shot CLI composition with explicit protected configuration, existing database, current identity and canonical binding; no implicit initialization, grants or scheduler. This proves entrypoint composition only, not actual stage execution.
  CHECK: node --test server/outcome-work-runner.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 CLI has --dispatch/--receive only; protected owner-only files, runner HEAD/tracked-code checks, existing SQLite schema and candidate Git tree verification precede action. No arguments yields configuration_hold with false authority and no dispatch. Integration uses real local files/database/grants/journal with fixture identity and queue: one send, one claim, duplicate readback, revoked approval, changed binding, wrong runner pin and permissive config rejection. Work suites 52 PASS and full npm test 886 PASS at fce4069; candidate-tree addition at b5a65c1 targeted runner tests 2 PASS. Fixture syntax failure in 450c262 corrected in ce1ec08; not a production run. Scope scripts/run-outcome-work.mjs and runner tests. Rollback: task-owned commits only. No live config, new grant, stage execution, start/terminal publication, schedule or deployment was created. Live configuration and real stage execution remain unmet requirements.

- [x] AP4-04/05 initial queued work reaches one durable implementing reservation under authenticated current approval and dependencies, without fabricating a prior terminal receipt or running event. This is tested integration, not live start or Predicate closure.
  CHECK: node --test server/outcome-work-local-runtime.test.mjs server/outcome-work-continuation.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 RED initial scenario failed before correction. GREEN work-module suites: 50 PASS, 0 FAIL. Integrated initial cases cover one send/one receiver claim, reconstructed duplicate, revoked approval, missing dependency, blocked/stale queued state, fabricated prior receipt and unknown delivery without retry; journal stays queued/waiting after receipt. Scope is journal/controller/local-runtime and tests. Full npm test: 884 tests, 880 PASS, 4 FAIL in outcome-current-projection.test.mjs (source_digest_drift); baseline/regression classification remains OPEN, not waived. No Release PASS, live execution, deployment or Phase closure. Rollback is task-owned candidate revert only; user-owned files preserved.

- [x] Native read-data restriction permits exact test input and runtime libraries but denies an outside file; inherited environment is minimal. This is platform feasibility only, not executor activation.
  CHECK: node --test server/outcome-work-sandbox.test.mjs
  EXPECT: fail 0
  EVIDENCE: Historical FAIL 2026-09-09 at a590d7e preserved: startup aborted and the device-path correction failed. Subsequent read-only crash inspection placed the abort in dyld CacheFinder; matching kernel evidence at 08:24:53 showed file-read-data denied for the root directory. Adding only `(literal "/")`, not a root subpath, resolves startup. Current native probes: 3 PASS, 0 TODO; exact input reads, outside sentinel direct and symlink reads are denied, outside writes and TCP remain denied. Combined sandbox/runtime/grant regression: 9 PASS, 0 FAIL, 0 TODO. Same-session feasibility evidence only: this permissive-default exploratory profile is NOT a production sandbox. Command pinning, inherited descriptors, subprocess/IPC capabilities, descendant cleanup and actual authorized stage execution remain unproven; no activation or Phase closure.

- [x] Native local sandbox feasibility: actual child writes only the explicit test-owned subtree; outside sentinel is preserved. This probe does not prove privacy/read isolation, command pinning, descendant cleanup or stage execution.
  CHECK: node --test server/outcome-work-sandbox.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 native macOS child-process probes 2 PASS, 0 skipped: explicit subtree write succeeds, outside sentinel write returns EPERM/EACCES and bytes remain unchanged; connection to a real listening loopback test server returns EPERM/EACCES. Test-only temporary files/server removed after checks. Profile uses allow-default plus write/network restrictions, so unrestricted reads remain and this MUST NOT be activated as the final private-work executor. No stage commands executed.

- [x] V2 grant binds explicit checkout reference, per-stage argv/timeouts and exact relative write paths to approval bytes. V1 remains transport/reservation compatibility only; no automatic conversion to command permission. Contract parsing is not an OS sandbox or executable trust proof.
  CHECK: node --test server/outcome-work-execution-grant.test.mjs server/outcome-work-grant-store.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session grant/store/controller suites 20 PASS, then dedicated V2 persistence/revocation test added. Commands and paths are covered by the immutable authorityRef; changed argv/path/checkout fails against original approval. Traversal/glob/duplicate paths, shell program, invalid timeout and incomplete stage coverage rejected. Program allowlist is syntactic only: node/npm/git can run arbitrary code, so an isolated executor with separately enforced scope/network boundaries is still required. No commands or live grants were issued.

- [x] Receiver entrypoint revalidates authenticated grant, current policy and protected evidence, then consumes the exact reservation once without sending any new message.
  CHECK: node --test server/outcome-work-local-runtime.test.mjs server/outcome-work-continuation.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session local-runtime/controller suites 15 PASS, diff check PASS. Integration follows send/ack through wrong-reservation rejection, first claim, reconstructed duplicate claim, revoked-grant rejection, one total send and one stored claim. Receiver pins reservation authority to current policy authority. No live receiver activation, start event, stage command or completion publication; no claim that external account revocation is atomic with the local database transaction.

- [x] Receiver claim atomically checks the same local grant store and exact journal reservation; expired/revoked/missing grant, wrong owner and unsent/unknown delivery cannot claim. Repeated claim never grants a second execution.
  CHECK: node --test --test-name-pattern='receiver claim' server/outcome-work-continuation.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session controller/journal/local-runtime 19 PASS; diff check PASS. Eight receiver cases use real SQLite grants and reservations. BEGIN IMMEDIATE serializes grant revocation and claim in the same database; missing co-located grant table fails closed. Duplicate claim after constructing a new journal returns already_claimed. Caller still must authenticate current identity and verify binding/dependencies/receipt coverage; claim is not actual execution/start evidence and does not roll back work already started before later revocation. No runtime database migrated or receiver activated.

- [x] Integrated runtime reaches the existing queue adapter with exact session binding; reconstructed runtime does not enqueue twice.
  CHECK: node --test server/outcome-work-local-runtime.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session integrated suite 2 PASS (eight integration scenarios plus bounded configuration failures); diff check PASS. Actual account service, SQLite grant/journal, protected receipt file, protected registry and Codex queue adapter compose through shell-free argv; identity provider, owner probe and spawned process are fixture ports. Reconstructed runtime retains one total enqueue. This is not a real agent stage execution or owner dogfood.

- [x] Work stage queue transport matches exact private session digest and binding version; cancellation/mismatch prevents enqueue. Acknowledgement remains transport-only, not stage evidence.
  CHECK: node --test server/outcome-chat-codex-queue.test.mjs server/outcome-work-queue.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session queue/work-dispatch/local-runtime suites 17 PASS; diff check PASS. Existing adapter exposes a boolean exact session digest check only under live-owner mode. Local runtime accepts this adapter as its dispatch port; packet carries candidate/authority/reservation and no new execution authority. Cancellation is checked before spawning; abort terminates the child with unknown delivery. No actual stage request sent in this correction. Receiver-side authority/claim consumption and current policy/token composition remain necessary; packet instructions alone cannot enforce them.

Live local transport canary · 2026-09-09 · current source 467d7a4. Cherry's local connection/limited verification approval was used for exactly one existing Planner queue submission, correlation message-4a67d7a49b092026. Protected registry resolved exactly one active Planner matching this thread; existing owner probe and cwd/registry checks passed. CLI adapter returned acknowledged. The message subsequently appeared in this conversation and received the requested final answer. Read-only existing response collector returned completed, exact correlation=true and exact answer=true; source digest 7df65c9d8f9c35f914e4559d2190af0c0c10ae05e4edbb2f6ccf941a0256d7b0. No resend, new session, hosted DB, environment change, deployment or stage execution occurred. This proves real transport and answer extraction only, not authenticated execution-grant issuance, stage controller dispatch or Phase 4/5 completion. The canary used the existing queue adapter directly; do not attribute it to the new integrated runtime.

- [x] Local integrated entrypoint composes owner authentication, durable grant/journal, current work policy and protected receipt reads before a bounded dispatch. Missing dependencies, mismatched terminal receipt or changed current policy stop the action. Default disabled; no daemon, environment change or implicit stage events.
  CHECK: node --test server/outcome-work-local-runtime.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session integration/journal 5 PASS; full npm test exit 0 with server 874 PASS. Additional configuration/oversize/timeout test subsequently added and integrated suite 2 PASS; diff check PASS. Real temporary SQLite and mode-0400 receipts, existing account service with fixture identity provider, synthetic policy and transport; seven integration scenarios. Current live policy/token/dispatch adapters remain absent. No owner dogfood, initial queued-to-implementation bootstrap, executor-side atomic authorization or Phase completion claimed. Cherry approved local activation/testing in this turn; no additional activation approval request is needed within that exact boundary, but absent adapters must be implemented and verified first.

- [x] Existing account authentication gates stored grant reads; revoked session and unauthorized project cannot read grants. Read-only adapter, not approval issuance or live activation.
  CHECK: node --test server/outcome-work-grant-store.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session store/controller suites 15 PASS; diff check PASS. Existing account service, fixture identity provider and SQLite store verify allowed project read, revoked session, wrong project and aborted read. Runtime token supplier and live route remain unconfigured; no live owner login or execution claim.

- [x] Re-read durable approval after asynchronous eligibility work; revocation during evidence verification must produce zero sends.
  CHECK: node --test --test-name-pattern='durable revocation during' server/outcome-work-continuation.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 RED reproduced acknowledged after durable revocation during final evidence read; GREEN controller/grant/store 17 PASS and diff check PASS. Same-session verification with actual SQLite store and synthetic transport. Re-resolve owner/status/immutable bytes after eligibility. Remaining distributed race between final read and external execution requires executor-side claim/authority enforcement; this correction does not claim atomic external revocation or live activation.

- [x] Local grant storage preserves immutable approval and monotonic revocation across restart, rejects wrong owner and changed bytes. Dedicated disposable SQLite tests only; no runtime database opened or migrated. Caller must authenticate owner before recording/revoking; no public API or implicit approval issuer.
  CHECK: node --test server/outcome-work-grant-store.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session grant-store/controller/grant suites 16 PASS; diff check PASS. Disk close/reopen confirms durable approval and tombstone, repeat record cannot reactivate, wrong owner and changed content fail closed. This is storage code, not authenticated live grant issuance; no runtime caller configured. Stored active status still requires expiry/current-owner/dependency/evidence checks in the controller.

- [x] Grant-controller composition checks fresh approval both before reservation and dispatch; missing resolver, revoked/expired/mismatched grant or failed evidence prevents sending.
  CHECK: node --test server/outcome-work-continuation.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session targeted controller/grant/journal/receipt 22 PASS, diff check PASS. Real in-memory journal plus injected resolver/transport verifies eight approval/evidence scenarios, reservation-to-dispatch revocation, expiry during evidence read and durable no-replay. Local composition only; live approval issuer/storage remains unconnected. No claim of atomic revocation across external dispatch or actual owner execution.

Execution grant local contract · Cherry approved 2026-09-09 · M4-2/AP-4-05, AP-4-06. Separate from recorded inbox decisions. Bind project/work/run, current session/binding, owner, candidate/tree, allowed local stages, validity interval and grant digest. Trusted local caller must supply freshly resolved active/revoked status and current owner; grant bytes alone confer no authority. Dependency/evidence verification remains separately mandatory. No live issuer, HTTP endpoint, database migration, activation or deployment.
- [x] Local grant rejects expiry, revocation, candidate/owner/binding drift and legacy decisions.
  CHECK: node --test server/outcome-work-execution-grant.test.mjs
  EXPECT: fail 0
  EVIDENCE: 2026-09-09 same-session verification: targeted grant/continuation/receipt/journal 20 PASS; npm test exit 0, server 867 PASS / 0 FAIL; git diff --check PASS. Pure local contract only; no grant issuer/current-state resolver or live controller integration claimed. Existing inbox decisions, UI, DB and deployment unchanged.

Stored receipt reader: explicit canonical local directory only, current-user-owned mode 0700; digest-named single-link regular files mode 0400, bounded 65536 bytes. Reject links, permissive permissions, absent/changed/different-content files and directory replacement. Return content-match result only, never bytes/paths or new authority. No directory creation or receipt publication. CHECK: stored-receipt real filesystem tests. EXPECT: valid immutable file matches; invalid files fail closed without disclosures. EVIDENCE: 2026-09-09 receipt/continuation/journal suites 17 PASS, diff PASS. Real temporary filesystem verifies immutable content, modification, writable file, hard/symbolic link, missing file and permissive directory; directory replacement is guarded in source but not yet fault-injected. Original-byte hash is checked before UTF-8 decoding. No trusted live evidence directory configured or authority established.

Authority integration finding 2026-09-09: outcome-decision-record.mjs publicRecord explicitly states recorded/dispatch out of scope, and its schema binds a blocked event decision rather than permitted execution action, candidate/tree or current dependency set. It is not a continuation grant. Preserve this meaning. A future explicit execution authorization contract must remain separate; do not auto-convert approved decision records, delivery acknowledgements or receipt content matches into grants. No hosted schema, credential, existing approval record or UI has been changed.

M4-2/AP-4-06: add a bounded read-only JSON receipt checker. Trusted caller supplies expected digest, project/work/run identity, candidate commit/tree, stage, verification mode and nonempty required check IDs; receipt must match all fields and contain exactly one passing result per required check. Reject oversized/malformed input, additional fields, duplicate checks, empty requirements, candidate/scope/mode drift and failed results. Digest integrity is not issuer trust or execution approval; caller must separately resolve current authorized source and authority. No HTTP route, scheduler, live reader, signature issuer, approval or dispatch is created.
CHECK: node --test server/outcome-work-stage-receipt.test.mjs
EXPECT: matching receipt accepted only as content match; hostile/mismatched input rejected; no execution/completion authority.
EVIDENCE: 2026-09-09 receipt/continuation/journal suites 16 PASS. Receipt cases cover all identity/candidate/stage/mode fields, altered bytes, failed/missing/duplicate/extra checks, empty requirements and invalid input. Source callsite inspection still finds no production caller for the receipt checker or current-authority resolver for the continuation controller. These are implemented local prerequisites, not integrated continuous execution. No new permission or live activation is inferred.

#### Restart delivery readback correction · 2026-09-09

AP-4-06 structural evidence prerequisite: before reserving or beginning qa_verifying/release_verifying, the terminal record must contain a syntactically valid evidence reference, even if an injected eligibility verifier returns true. This is only a necessary condition; a digest does not prove artifact content, issuer, authority or PASS. CHECK: missing-stage-evidence continuation regression plus journal/observer suites. EXPECT: zero reservations and zero dispatch on absent evidence. EVIDENCE: RED reproduced 2026-09-09 (missing reference incorrectly acknowledged); GREEN 21 tests passed including both implementing-to-QA and QA-to-release checks, diff check PASS. No live activation or full evidence-verifier claim.

Scope: M4-1/AP-4-04 and AP-4-07. Preserve the current UI/design. When an exact existing continuation reservation is found after eligibility and source checks, read its durable dispatch outcome. A stored acknowledgement is delivery evidence only, never execution start or stage acceptance. Stored unknown remains unknown; reserved or dispatch_started remains reconciliation_required. No resend or result write is permitted on this recovery path. Original action/candidate/authority mismatches remain fail-closed.

CHECK: node --test server/outcome-work-continuation.test.mjs server/outcome-work-journal.test.mjs
EXPECT: persisted acknowledged/unknown results recovered with one total send; unresolved starts never replay; completionAuthority=false and executionAuthority=false preserved.
EVIDENCE: 2026-09-09 targeted continuation/journal suites 12 PASS, full npm test PASS (235 frontend and 859 server), diff check PASS. Four recovery states verify zero sends and zero result writes; closed/reopened disk DB recovers a receipt with one total send, and revoked eligibility blocks readback reporting. Existing parallel/revocation/timeout/candidate and authority guards retained. Same-session local verification only; no live transport integration, activation, commit or deployment for this correction yet. Source review confirms existing chat service returns delivery/response-collection results, not candidate-bound stage verification evidence; do not wire its timer to stage dispatch as a substitute.

Within M4-1/M4-2 and AP-4-02/04/06/07/10, verify one session traverses all three stages; terminal-without-next-action is detected; one eligible action is claimed once; duplicate/out-of-order events and restart cannot double-dispatch; stale observations never become false stopped/running; changed candidates invalidate old verification; missing authority stops only affected actions; read-only observation changes no Gate/progress. Use real supported source integration and owner Preview testing before calling the feature active. Synthetic state-machine tests alone do not prove continuous operation.

Implementation sequence: (1) work/stage observation contract and finite projector; (2) supported session-event ingestion plus durable cursor; (3) separate authority-bound continuation controller with crash reconciliation; (4) single-work-card UI and real Preview interruption/recovery dogfood. Current runtime remains unchanged until its corresponding bounded implementation and activation evidence exist.

## Product decision

OUTCOME의 채팅은 **Planner single input channel**이다. Cherry가 입력하는 composer는 Planner 보기에 하나만 존재한다. Builder·UX & Product QA·Release Audit 보기는 Planner가 라우팅한 동일 작업 원장의 읽기 전용 필터이며, 별도 채팅방이나 직접 지시 입구를 만들지 않는다. Codex 앱과 거의 동일한 수준으로 실제 작업 흐름을 이해하되 역할 권한과 단일 입구를 보존한다.

현재 대시보드의 `세션 채팅 · 연결 준비 중` 영역은 이 최종 제품의 자리만 예약한다. 실제 session event source가 연결되기 전에는 메시지 입력, 전송, 작업 애니메이션이나 완료 상태를 가장하지 않는다.

## Outcome

Cherry가 OUTCOME을 벗어나 Codex/Claude 화면을 따로 열지 않고도 Planner 한 채널과 대화하고, Planner가 Builder·UX & Product QA·Release Audit에 라우팅한 작업과 각 역할의 응답·검증·대기 상태를 같은 원장에서 이해한다.

## 사용자 판단

Cherry는 선택 프로젝트에서 다음을 즉시 판단할 수 있어야 한다.

1. 지금 어느 역할 세션을 보고 있으며 실제로 연결되어 있는가.
2. 내가 보낸 요청이 수신·실행·검증·대기 중 어디에 있는가.
3. 어떤 도구가 실행됐고 어떤 파일·테스트·증거가 바뀌었는가.
4. 승인이 필요한가, 추가 입력이 필요한가, 안전하게 중단하거나 재시도할 수 있는가.
5. 세션 작업이 Package의 어느 Stage와 연결되며 왜 아직 Gate 완료가 아닌가.

## 실시간 작업 타임라인

하나의 ordered timeline에서 다음 event type을 같은 시간축으로 제공한다.

- Planner 채널의 사용자 메시지
- 에이전트 응답의 실시간 streaming
- commentary와 사용자에게 공개 가능한 작업 설명
- 계획 생성·수정과 단계별 상태
- 도구 호출, 명령 실행, 탐색과 결과 요약
- 파일 변경과 diff, 생성·수정·삭제된 artifact
- 테스트·빌드·검증 명령과 통과·실패 결과
- 승인 요청, 사용자 입력 요청, 안전 중단과 재개
- candidate commit/tree/asset 및 evidence pointer
- 오류, 재시도, 취소, provider disconnect와 재연결

각 event는 최소 `event_id`, `thread_ref`, `role`, `sequence`, `created_at`, `kind`, `state`, `public_payload`, `correlation_id`를 가진다. 같은 event를 다시 받아도 중복 표시하지 않으며 sequence gap과 충돌을 숨기지 않는다.

## 상태 모델

| 상태 | 화면 의미 | 허용 동작 |
| --- | --- | --- |
| `queued` | 요청이 순서에 들어갔으나 실행은 시작하지 않음 | 취소 |
| `responding` | 에이전트 응답이 streaming 중 | 중단 |
| `tool_running` | 명시된 도구·명령이 실행 중 | 세부 보기, 허용될 때 중단 |
| `verifying` | 테스트·빌드·근거 검증 중 | 세부 보기 |
| `waiting_approval` | 외부 변경 또는 고위험 동작에 Cherry 결정 필요 | 승인, 거절 |
| `waiting_user` | 질문이나 자료가 필요해 멈춤 | 답변, 첨부 |
| `completed` | 해당 turn이 정상 종료됨 | 후속 요청, artifact 열기 |
| `failed` | 오류로 turn이 종료됨 | 오류 보기, 안전한 재시도 |
| `cancelled` | 사용자 또는 시스템이 중단함 | 새 요청 |
| `reconnecting` | event stream 재연결과 sequence 복구 중 | 대기, 수동 새로고침 |

세션 상태는 작업 진행 신호이며 Project/Phase/Scope/Stage/Gate 진행률이 아니다. Gate는 Package evidence가 조건을 충족할 때만 별도로 바뀐다.
No session activity changes progress, health, confidence, Gate state or completion authority.

## 상호작용 계약

- 프로젝트별 네 역할 표시는 **read-only filters over the same ordered event dataset**이다. 역할 필터는 별도 자료나 별도 방을 만들지 않는다(**do not create separate rooms**).
- 각 역할에는 project-scoped active thread와 교체 이력이 연결된다.
- 모든 새 요청은 Planner에게만 들어가며, **only the Planner view exposes a composer**. 다른 역할 보기에는 composer·직접 전송·우회 입력을 표시하지 않고 `Planner에게 요청`으로 돌아가는 명시적 이동만 제공한다.
- Planner는 검증된 대상 역할 하나에만 라우팅하며 다른 역할 전달은 Planner routing receipt로 표시한다. Direct Cherry-to-Builder, Cherry-to-QA and Cherry-to-Release-Audit send paths are forbidden.
- 사용자는 Planner 메시지를 보내고 streaming을 중단할 수 있다. Role-chat attachments and clarification threads are excluded from this MVP.
- 자동 재시도는 외부 전송이 일어나지 않았음이 증명된 pre-dispatch 실패에만 허용한다. 전송 뒤 응답이 불명확하면 `delivery_unknown`으로 종료하며 새로운 Cherry 행동 없이 재전송하지 않는다.
- 승인 카드는 exact action, target, impact, expiry, rollback을 보여준 뒤 승인·거절을 받는다.
- tool result, diff, test, artifact는 timeline을 압도하지 않는 접기 상세로 제공한다.
- Stage 연결은 문맥 표시와 evidence pointer를 제공하지만 세션 UI가 Gate를 자기 폐쇄하지 않는다.
- 과거 기록은 날짜·역할·상태·Stage로 탐색하고 끊긴 세션은 replacement history를 보존한다.

## 동작과 모션

- 새 token은 안정적인 streaming cursor와 함께 나타난다.
- 활성 역할은 한 개의 절제된 live indicator로 표시한다.
- 계획·tool·검증 상태 전환은 위치를 흔들지 않는 짧은 transition을 사용한다.
- 장기 실행은 spinner만 반복하지 않고 현재 event kind와 마지막 관측 시각을 함께 보여준다.
- `prefers-reduced-motion`에서는 pulse·shimmer·이동 애니메이션을 정적 아이콘과 상태 문구로 바꾼다.
- 애니메이션의 빈도·길이·메시지 수는 진행률이 아니다.

## Source truth와 실패 시 차단

- Phase 3 adapter가 공식·승인 interface로 event observation, exact dispatch, acknowledgement와 receipt를 증명해야 Phase 4 live interaction을 연다.
- event source가 없거나 stale이면 `연결 준비 중`, `관측 오래됨`, `오프라인` 중 실제 상태를 표시한다.
- 가짜 메시지, 가짜 tool activity, 합성된 streaming, 추정 완료, 자동 성공 처리를 만들지 않는다.
- sequence gap, duplicate, binding mismatch, permission failure는 fail closed하고 timeline에 명시한다.
- provider가 지원하지 않는 기능은 유사 구현으로 속이지 않고 비활성 상태와 이유를 표시한다.

## Privacy와 보안 경계

- 사용자에게 필요한 공개 가능한 commentary와 tool summary만 표시하며 private reasoning 또는 숨겨진 chain-of-thought는 표시·저장·요청하지 않는다.
- credential, token, cookie, raw session/thread/task/turn ID, local path와 unredacted prompt/result는 public surface와 일반 log에서 0건이어야 한다.
- private workspace도 project·role·actor 권한과 최소 공개 payload를 강제한다.
- 승인·거절·중단·재시도·routing·artifact 접근은 actor와 timestamp가 있는 audit event를 남긴다.
- provider message dispatch, shell/file mutation과 external operation은 해당 capability와 별도 승인 경계를 따른다.

## UX acceptance

- desktop에서는 정보 우선순위를 Outcome Map → 승인 → Planner 대화로 유지한다. 1100px 이상 통합 배치를 실측하고, 임계 폭 아래에서는 대화를 승인과 동급의 peer tab으로 접는다.
- mobile에서는 지도·대화·승인의 세 최상위 목적지를 한 손으로 오가며 현재 맥락을 잃지 않는다. 역할 필터는 대화 안의 읽기 렌즈이며 새 최상위 탭이 아니다.
- streaming 중에도 메시지, 계획, 도구, 검증, 승인 요청이 시각적으로 구분된다.
- 현재 역할, 현재 turn state, 마지막 관측 시각과 Stage 연결이 첫 화면에서 식별된다.
- 긴 tool output과 diff는 접혀 있고 사용자가 열기 전까지 대화 흐름을 밀어내지 않는다.
- 연결 중단 후 재연결하면 마지막 confirmed sequence부터 복구하며 중복 event와 누락을 표시한다.
- keyboard, screen reader, focus restoration, 44px touch target, reduced-motion과 contrast 요구를 충족한다.
- OUTCOME 사용자는 Codex 앱과 비교해 핵심 작업 정보나 필수 제어가 빠졌다고 느끼지 않아야 한다.

## Phase ownership

- Phase 3: existing session binding, observation, Planner routing, receipt와 Phase 3 adapter proof.
- Phase 4: project/Package 생성, 역할 세션 생성·연결, 이 Session Workspace, OUTCOME-native full development.
- Phase 5: Question 200과 목적 기반의 동적 역할·도구 구성.

Phase 4 entry에는 Phase 3 supported adapter evidence, account/private workspace authorization, ordered event persistence, reconnect recovery와 mutation approval architecture가 필요하다. 이 문서 작성은 Phase 3·4 진행률, 구현 완료, QA, Release Audit, Cherry acceptance 또는 `EXTERNAL_OUTCOME_COMPLETE`를 의미하지 않는다.

## Non-goals

- Codex 화면의 픽셀 단위 복제
- private reasoning 또는 숨겨진 내부 추론 노출
- 활동량을 결과 진행률로 계산
- 승인 없는 provider/resource/file/release mutation
- 실제 event source가 없는 demo animation을 운영 UI에 표시
- 공급자 화면을 대신하는 범용 채팅
- 역할 채팅 안에서 역할·세션·프로젝트 생성
- Direct Cherry-to-specialist messaging 또는 승인 대행
- Role-chat attachments, clarification threads 또는 콘텐츠 조정
- Gate 자기 폐쇄, 활동 기반 progress, 배포·출시 조작
