# Control continuity scheduler — Builder candidate receipt

Status: BUILDER CANDIDATE ONLY; independent QA, Release Audit and live integration OPEN. `completionAuthority=false`.

## Authority, outcome and immutable scope

This is the implementation slice authorized by the 2026-09-05 control-rebuild handoff, SHA-256 `0fec271ffa736d48b031ac87d274abe1f28dfcf5de47526c49f6391bab78b9dc`. It supports `outcome-milestone-model-v2-local-default-projection` and approved MVP D9, reusing foundation F3/F5/F6/F7/F8 and the handoff's seven executable expectations. It creates no new canonical Gate and does not change their historical verdicts.

Expected user outcome: verified completion releases capacity and selects authorized useful successors in the same control transaction, without treating a local hold as a project-wide stop or fabricating running workers. This candidate proves only the local reduction/persistence portion. System closure additionally requires the independent checks and real cycles below.

Base/parent: `1dbe5486f088216ec80b410efe90de93cdb94d8d`; base tree: `e8938e5acd749a158dfc202c9c3d477d66439aed`. The initial worktree was clean. Current role/unique app/self/worktree binding was verified before implementation. Private locators are intentionally omitted.

Only three of the five authorized paths are changed:

- `server/outcome-continuity-scheduler.mjs` — new local composition, no route/daemon/provider integration.
- `server/outcome-continuity-scheduler.test.mjs` — new deterministic and hostile Builder checks.
- This receipt — adapter contract and bounded evidence.

Existing control-plane source and all 38 original tests are unchanged. `selectNext` retains its public API. The scheduler is separate because durable queue/claim/reload state is not equivalent to that API's one-item eligibility suggestion. No packages, runtime wiring, automation, registry, credential, provider, database or deployment changes were made by this Builder.

The candidate is the single commit containing this receipt. To avoid a self-referential commit hash, the immutable private finalization receipt records that commit/tree/parent, this file's final hash, test-log hashes and any push/readback. QA must pin those exact values; a branch name is not a candidate pin.

## Verified diagnosis and changes

- The existing selector suggests one eligible item, but does not atomically persist terminal consumption, freed capacity and successor reservation.
- Observer V5 is an observe/append/project contract, not an executable refill obligation. The historical queue contains interleaved reverse-chronological claims and obsolete running entries; it is not a typed durable state machine.
- The initially reported stale automation diagnosis is no longer a current-state assertion: readback during this run showed the Observer heartbeat PAUSED and one active Planner control heartbeat using Heartbeat Control V2. That operational update belongs to Planner, not this candidate. Its prose explicitly leaves tested persistence integration open.
- The new reducer replays authenticated canonical events, consumes a work fingerprint once, reserves up to four nonconflicting intents, and selects the next authorized priority item during the terminal reduction. It never calls a transport.
- Terminal evidence outranks stale running observations, including a running cursor observed before a lower-cursor terminal receipt. Duplicate events do not return a new send capability; contradictory terminal receipts fail atomically.
- Pending, claimed, delivered, started, unknown and terminal remain separate. Public active counts mean stored STARTED observations, not promises, reservations, acceptance or a freshness guarantee. Implementation and preparation counts are distinct; control/Observer/CEO are excluded.
- A claim must pass current binding and authority checks. Unknown/claimed work retains its lane until exact readback; a restart never turns it into a resend. The durable CAS helper uses an exclusive lock, old-head comparison, mode-0600 temporary file, file/directory fsync, atomic rename and readback. It does not automatically clear a pre-existing lock.

## Executable evidence

All commands use the pinned Builder checkout as process cwd, not merely absolute test paths. The private evidence bundle preserves command outputs and exit codes; the finalization receipt pins its manifest.

| CHECK | Actual result |
| --- | --- |
| Original control-plane tests before changes | 38/38 PASS |
| First combined new/original run | 51/52; new cycle test failed with `clock_regression` in its harness |
| Focused combined run after one scoped correction | 52/52 PASS: 38 original + 14 new |
| `npm run test:package-model` | 50/50 PASS |
| `npm test` | frontend 130/130 + server 584/584 PASS |
| `node --test scripts/*.test.mjs server/*.test.mjs` | 676/676 PASS |
| `npm run test:security` | 75/75 PASS; snapshot and client environment boundaries PASS |
| `npm run build` | PASS; 1,654 modules; generated local build only, no deployment |
| `npm run check:scope` | PASS |
| `npm run check:mutations` | PASS; public-local 32/32, API 28/28, stable-private 24/24; decision matrices 7/7 |
| `git diff --check` and exact three-path allowlist | PASS; final staged readback additionally pinned in private finalization receipt |

One coherent correction was used: restore the test harness's monotonic receive clock across actual checkpoint reloads, and make terminal precedence independent of stale observation cursor ordering. No further source correction loop is authorized by this run. The first harness failure is not an independent QA verdict or a behavioral RED proving the missing scheduler. Original absent scheduling capability was established by source inspection; fresh independent QA must provide its own hostile RED-before-GREEN evidence where feasible.

A later paired Builder reproduction reconstructs the pre-correction cursor condition in memory, without changing candidate bytes: stale running cursor 9000 followed by terminal cursor 2 leaves `phase=started, successors=0, publicActive=1` (exit 1). The identical probe against candidate bytes yields `phase=terminal, successors=1, publicActive=0` (exit 0). This is explicitly a reconstructed baseline comparison, not an earlier independent observation or QA verdict; its script and both outputs are pinned in private evidence.

The three simulated cycles each completed four started intents and reserved four successors, with a checkpoint reload between cycles. Other cases cover a scoped authority hold/new grant, no-ready dependencies, excluded roles, canonical/worker/lock conflicts, explicitly scoped same-candidate QA/Audit concurrency, unknown delivery, duplicate completion, stop/expiry/drift, consumed renamed work, signature/shape/clock/sequence rejection, getters/Proxies/callback rejection, CAS conflict and public identifier omission. Crash cases model the persisted boundary before send, after send before ack, and after ack before checkpoint; they do not launch or crash actual workers.

## Concrete Planner adapter contract

This is a private, single-owner adapter contract, not permission for callers to create authority. First operational adoption can use existing Planner tools and queue under Heartbeat Control V2; no new daemon or credential is authorized or required for that manual control transaction. Connecting the signed reducer additionally requires verification of the existing trusted attestation boundary's support for this event schema. That support is NOT implemented or established by these tests. Do not generate a new production key, use a fixture key, or silently replace the existing role-evidence verifier.

### Input normalization and trust

1. Resolve the current project+role through the private registry and a unique, loadable app peer. Pin exact role, binding revision, thread, worktree/source candidate and authority scope. For Claude UI work, establish the explicit current shared-UI lease and unique destination before any interaction. A role-looking subagent is never a substitute.
2. Maintain a private lease digest for the exact resolution above; never use an app inventory host as routing authority. Materialize each queue item from an immutable handoff, not natural-language status. `scope` pins allowed paths, forbidden actions, acceptance predicate and rollback. `approvalSource` pins the actual approving source. `parallelGroup` is non-null only for explicit concurrency authority on one immutable QA/Audit candidate. Dependencies and resource locks must reflect real conflicts, not just different labels.
3. The trusted owner constructs exact own-data records, canonical JSON and Ed25519 attestations. Constructor `publicKey` and expected checkpoint head come only from host-pinned configuration, never a queue/request body. A signature proves adapter provenance, not Cherry approval, role binding correctness or receipt truth. Before signing, the adapter must validate those original sources, current time and source evidence. Signed `time` is monotonic receive time; `cursor` is source-observation order. Wall-clock freshness is an adapter obligation, not proved by event replay.
4. Queue fields are exact: `id,workstream,kind,capability,target,candidate,scope,worker,binding,priority,dependencies,locks,approvalSource,parallelGroup`. Compute each grant's `work` with `continuityWorkDigest(canonicalJobJSON)`; grant also contains exact `source` and `expires`. The fingerprint excludes queue label, priority and dependencies, so relabeling is not a retry budget. Queue IDs are immutable once seen in current configuration or an intent. Do not reissue consumed work through an alias or rotation; any materially new authorized attempt requires a new exact scope and preserved lineage upstream.
5. Send a signed `configure` event containing increasing `revision`, stable `project`, one `canonicalTarget`, and the exact queue/grants/bindings. Every event has `id,sequence,time,kind,data`; the envelope is canonical JSON `{body:<canonical event JSON string>,signature:<128-character lowercase hex>}`. Event sequence is contiguous and globally serialized. On malformed, stale, ambiguous or conflicting inputs, retain the old checkpoint and classify the exact gap; do not infer permission.

### One completion-to-successor transaction

| Boundary | Required adapter action and durable evidence |
| --- | --- |
| Observe | Read only unseen destination boundaries using saved cursors. Verify terminal role, candidate, attempt, source and immutable receipt. A badge, send acknowledgement or natural-language completion alone is insufficient. |
| Reduce terminal | Submit `observe` with exact intent/binding, `phase=terminal`, cursor, receipt digest and verified finite verdict. Preserve the returned checkpoint and selected successor intents together. `accepted` requires the relevant acceptance authority; an implementation result or preparation is not Cherry acceptance. |
| Persist | Call `commitContinuityCheckpoint` with private absolute path, previously read/pinned digest and returned checkpoint. Advance the private manifest head only after durable readback. All writers use the same protected parent directory and lock. The helper is not a hostile-filesystem/symlink ownership validator; the adapter must establish directory ownership and safe path/lease first. Any CAS/error/ambiguous write means readback, no send. |
| Claim | Re-resolve current exact role/app/lease and authority immediately before a selected pending intent is claimed. Reduce `claim {intent,binding}`, then CAS and read back that checkpoint BEFORE physical transport. Only the fresh claim result from the successful CAS writer may authorize this one send attempt. Reservation alone never does. |
| Send once | Use existing Codex app peer transport with exact resolved thread and automatic host resolution. Use Claude UI only under its explicit lease and authorized destination. Include the immutable handoff and correlation identifier. No automatic retry, replacement worker, provider callback or additional implementation target. |
| Acknowledge | Persist `delivered` only from a verified provider acknowledgement. Persist `started` only after the destination's new correlated turn or STARTED is observed. Each observation has its own immutable receipt. Record actual timestamps and terminal-to-STARTED latency separately from event receive order. |
| Ambiguous result/restart | Reload the last protected checkpoint. A claimed or unknown intent enters exact destination readback, never resend; even a crash before the physical send remains fail-closed. A verified later STARTED/terminal may resolve it. Unknown delivery alone cannot release the lane. |
| No successor | Consume no new claim. Record the private hold's exact workstream, missing capability, approving source and permitted independent work, or dependency/conflict/no-eligible-work evidence. New scoped authority/configuration triggers a new reduction without repeating the same approval request. Unchanged state stays quiet. |

Do not republish a stored STARTED count as fresh NOW without current destination evidence. Public consumers receive `projectPublic()` only, never `privateView()` or the event/checkpoint/lease data. The projection cannot grant dispatch, completion, release or Gate authority. Checkpoint/head files and complete logs stay private; only safe counts are public.

### Exact integration gap and next verification

The kernel is not wired to heartbeat, queue, existing evidence verifier or UI/app tools. There is no production signing adapter in this change. Existing role-evidence tokens have a different schema and must not be passed as scheduler envelopes or treated as interchangeable authority. Before claiming executable integration, independently validate a minimal trusted adapter at the existing evidence boundary, with its host-pinned verification root, protected durable head and actual current-source checks. If schema support is absent, request that exact adapter capability/path scope; keep the already-authorized manual Planner control transaction and unrelated safe work available. This is a narrow integration gap, not a blanket project stop or a request to approve the same rebuild again.

QA must freshly reproduce this candidate in isolation, including attempted caller-selected trust roots, backdated-but-signed facts, stale/changed leases, out-of-order terminal evidence, expired reservations, filesystem failure/ambiguous head recovery, alias/rotation replay and false acceptance injection at the adapter boundary. The 14 new local tests do not establish a trusted production input source. Release Audit must separately examine privacy, persisted receipts, authority, rollback and this open integration boundary. Neither a green synthetic test nor this Builder receipt substitutes for either verdict.

After independent QA and Audit, Planner owns integrating the existing heartbeat/queue. System closure requires three REAL verified terminal → eligible authorized successor → destination STARTED cycles, with exact candidate/receipt correlation, real timestamps and latency, zero duplicate sends and no unnecessary approval request. Fewer than four ready lanes requires exact blocking evidence plus critical-path advancement, not filler. Four initial starts do not satisfy the cycles; D9 service ingest/streaming and any 24-hour continuity claim remain separately unverified.

## Preservation, stop condition and rollback

D5 candidate `1dbe5486f088216ec80b410efe90de93cdb94d8d` remains failed-QA history because of the independently reported noscript browser/discovery mismatch. Its QA receipt hash is `29a9c59963f8a76422c66dd7687fa22379b7cfd92a2d74f4f12021f71048b5ec`. Historical scanner tests passing do not erase that failure. This task makes no scanner correction, acceptance, deployment or Gate-closure claim. Phase 5 designs remain supporting history, not a parallel implementation target.

No automatic retry/repair follows another decisive defect after the one scoped correction. Preserve the evidence, declare the exact fallback and return a bounded successor handoff. Rollback is a separately authorized revert of this task-owned candidate only, after verifying its exact parent and unrelated dirty bytes. Never reset/clean or remove user files, previous receipts, role history or tasks. Before finalization, reverify current binding, source/tree/parent, handoff hash, exact allowlist and dirty fingerprint. Candidate commit and optional one non-force push are not promotion, QA, acceptance or release.
