# Gates: Phase 4 timeline status read

Scope: AP-4-READ-STATUS / outcome-stage-phase4-timeline-status-read under outcome-phase-4-linked-chat. Local unpromoted read-projection candidate only.

Builder: SAFE_HOLD_SCOPE_CLOSURE at first unexpected T7 failure; no candidate commit. UX & Product QA: OPEN. Release Audit: OPEN. Cherry acceptance: OPEN. Previous 90daddb procedural Audit FAIL remains OPEN; this slice cannot erase it. completionAuthority=false.

- [ ] T1: Reload returns authoritative delivery/dispatch_state; state stays queued and reads never send.
  CHECK: node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
  EXPECT: native exit 0; Reload returns authoritative delivery/dispatch_state; state stays queued and reads never send.
  EVIDENCE: Builder focused command native exit 0, 79/79 tests; assertions for this predicate executed. Acceptance checkbox remains open pending independent review.

- [ ] T2: Closed user-message own-data enums; hostile/missing fields fail generically with zero accessor/Proxy evaluation; non-user shape unchanged.
  CHECK: node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
  EXPECT: native exit 0; Closed user-message own-data enums; hostile/missing fields fail generically with zero accessor/Proxy evaluation; non-user shape unchanged.
  EVIDENCE: Builder focused command native exit 0, 79/79 tests; assertions for this predicate executed. Acceptance checkbox remains open pending independent review.

- [ ] T3: One same-row Postgres SELECT includes both existing columns and the exact four scoped parameters; no join/write.
  CHECK: node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
  EXPECT: native exit 0; One same-row Postgres SELECT includes both existing columns and the exact four scoped parameters; no join/write.
  EVIDENCE: Builder focused command native exit 0, 79/79 tests; assertions for this predicate executed. Acceptance checkbox remains open pending independent review.

- [ ] T4: Common reachable producer states agree; Postgres intent-recorded failed/rejected is preserved.
  CHECK: node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
  EXPECT: native exit 0; Common reachable producer states agree; Postgres intent-recorded failed/rejected is preserved.
  EVIDENCE: Builder focused command native exit 0, 79/79 tests; assertions for this predicate executed. Acceptance checkbox remains open pending independent review.

- [ ] T5: Returned copies are detached; stored events retain exactly seven fields.
  CHECK: node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
  EXPECT: native exit 0; Returned copies are detached; stored events retain exactly seven fields.
  EVIDENCE: Builder focused command native exit 0, 79/79 tests; assertions for this predicate executed. Acceptance checkbox remains open pending independent review.

- [ ] T6: Project/binding/correlation isolation and hosted owner/workspace/project denial before repository access.
  CHECK: node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
  EXPECT: native exit 0; Project/binding/correlation isolation and hosted owner/workspace/project denial before repository access.
  EVIDENCE: Builder focused command native exit 0, 79/79 tests; assertions for this predicate executed. Acceptance checkbox remains open pending independent review.

- [ ] T7: Nonempty API-backed PlannerConversation fixtures, default-off behavior and TypeScript build pass without new UI labels.
  CHECK: npm test && npm run build
  EXPECT: native exit 0; Nonempty API-backed PlannerConversation fixtures, default-off behavior and TypeScript build pass without new UI labels.
  EVIDENCE: npm test && npm run build exited 1. Frontend 130/130 passed; server 665/666 passed. O1 terminal canary expected o1_evidence_closed but observed source_digest_drift. Build not reached. Attempt sealed; no retry.

- [ ] T8: Stock security/scope/mutation/broad/package checks pass; existing Current/progress/evidence unchanged; candidate unaccepted.
  CHECK: npm run test:security && npm run check:scope && npm run check:mutations && node --test scripts/*.test.mjs server/*.test.mjs && npm run test:package-model
  EXPECT: native exit 0; Stock security/scope/mutation/broad/package checks pass; existing Current/progress/evidence unchanged; candidate unaccepted.
  EVIDENCE: Not executed: first unexpected T7 failure sealed the attempt before T8. All acceptance states remain open.

## Single-attempt evidence policy

Before product edits, run only tests prefixed TIMELINE-RED once against base 90daddb. Expected failures are: memory missing returned status, API rejects new valid nine-field user event, and Postgres SELECT missing status columns. Any other failure or unclear response seals the attempt; no harness repair or automatic retry. Focused GREEN and each stock command run once. Overlapping suite counts are not summed. Gate checks record Builder evidence only; stage acceptance requires fresh independent QA/Audit and Cherry.


## Sealed attempt 2026-09-05

Intentional RED: three selected tests, native exit 1, 0 passed / 3 expected failures (memory undefined status, API 503 versus 200, PG missing selected columns). Focused GREEN: 79/79, native exit 0. T7 frontend: 130/130, including mounted nonempty actual API response (one message, zero composers/errors/request failures). T7 server: 665/666, native exit 1; no build or T8. No commit/push, no harness/source correction after failure.

Static failure trace: scripts/outcome-model-v2-local-canary.mjs pins the old complete Map digest da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3; the authorized child-stage/one-link refinement has digest d6991056545763f6ad81b4c1ba553d0fd40c2d14843498eeb0a6f32b7af65165. server/outcome-current-projection.test.mjs invokes that canary against this working directory and expects the old closed-evidence terminal. Neither file is allowlisted. This is a source/authority closure gap, not permission to repin historical evidence or weaken the test. Planner must choose an exact coherent treatment and issue new authority; no automatic continuation.

Recovery carrier: docs/OUTCOME_TIMELINE_STATUS_IMPLEMENTATION_RECEIPT_20260905.md. Retain all local task changes and previous receipts; T1-T8 acceptance remains 0/8, local passing checks are not an accepted stage. completionAuthority=false.

## Correction 1 — execution plan sealed before checks

New authority SHA-256 adb322eae06ed30652c3d6f90da64c22281b3d9080c576ed1ff8774ea08bd96d. Entry dirty manifest e7fc32a44e8f3d02a85e674e42dc339fdd1a7864ef94eb5129ed9ae61ec53125. Original sealed attempt and its failed evidence above remain unchanged. Same AP-4-READ-STATUS/T1-T8; no new Gate or acceptance.

Corrected harness server/outcome-current-projection.test.mjs SHA-256 add222eb05c1647451ca08f9a9d621518cea9c3214e2103af7f6596d7f612b6b. Production historical canary remains exact3b1d77a2f8382f1d92b6be4e88ad41fee89b77fea9e3617b609f002ca132e8bd. Historical terminal and whitespace/missing/symlink fixture read only the exact11 digest-verified local blobs from fixed90daddb222b705b48e6af0c764707c4758ed296f, not moving HEAD or worktree. Current Map drift is independently asserted as exact source_digest_drift with no extra fields/consumption/receipt and all safety counters zero. Existing HEAD-overlay test starts from the fixed base and verifies historical source digests, preserving its actual HEAD-vs-dirty-overlay assertions without creating a synthetic evidence commit.

Run in order, once each, only while all preceding commands have native exit0:
1. node --test server/outcome-current-projection.test.mjs
2. npm test
3. npm run build
4. npm run test:security
5. npm run check:scope
6. npm run check:mutations
7. node --test scripts/*.test.mjs server/*.test.mjs
8. npm run test:package-model
9. node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs

Capture complete outputs in task-owned evidence. First unexpected failure/ambiguous execution stops correction1; no test rewrite/retry/dependency repair/second correction. Previous focused79/79 remains historical; overlapping suites are not summed. Product/test/Map bytes from the original implementation are frozen except this approved harness and append-only Gate evidence. After all checks, original unused commit1/push1 ceiling only; no QA/Audit/Cherry acceptance. EVIDENCE: correction checks not yet executed.

## Correction 1 — Builder-local verification complete (2026-09-05 10:30:47 UTC)

Latest Builder status: CANDIDATE_READY_BUILDER_ONLY, pending exact Git candidate pin below/in correction receipt. This append supersedes only this slice's earlier Builder hold for new-candidate readiness; it does not rewrite the sealed failure or the previous procedural Audit FAIL. All T1-T8 Builder checks now have native exit0 evidence; their acceptance checkboxes remain OPEN pending independent QA/Audit/Cherry. No Current/progress/Phase change or old evidence rewrite.

| Check | Actual current correction evidence |
|---|---|
| T1-T6 | Fresh four-file timeline focused command: 79/79, exit0; frozen product/fixture bytes remain exactly as the original implementation receipt. |
| T7 historical/current distinction | Corrected current-projection test: 11/11, exit0; fixed base11blob historical terminal, current Map drift, missing/symlink/whitespace/invalid-source and privacy controls all executed. |
| T7 frontend/server/build | npm test: frontend130/130 and server667/667; npm run build: TypeScript and Vite exit0, 1654 modules. Nonempty mounted actual API response: one message, zero composers/page errors/request failures. |
| T8 security | npm run test:security: 75/75 plus stable snapshot validation and client environment boundary exit0. |
| T8 scope | npm run check:scope: PASS,98 files; exit0. |
| T8 mutations | npm run check:mutations: exit0; public method7/7, public mutation32/32, private mutation24/24, unavailable/enabled decision7/7 each. |
| T8 broad | node --test scripts/*.test.mjs server/*.test.mjs: 759/759, exit0. |
| T8 package | npm run test:package-model: 50/50, exit0. |

Every planned command was executed once; all native exits0. Counts overlap and are not summed. correction_count=1; retries=0; no additional source edits after harness sealing. Complete raw tool-collected command output is preserved in9 JSON evidence records with file hashes in docs/OUTCOME_TIMELINE_CANARY_CORRECTION_RECEIPT_20260905.md. The prior truncated failed-run record remains preserved rather than replaced. Historical canary script/pins and old receipts are unchanged. QA/Audit/Cherry and full hosted/UI/draft/goal/MVP closure remain OPEN. completionAuthority=false.

## Correction 1 — terminal precommit hold (2026-09-05 10:33:29 UTC)

Latest Builder status: SAFE_HOLD_PRECOMMIT_VALIDATION. This later observation supersedes candidate-readiness wording above. All9 planned runnable checks passed, but precommit staged-diff inspection reported docs/PHASE4_TIMELINE_STATUS_READ_CONTRACT.md:14: new blank line at EOF. The frozen original contract is outside this correction's editable source scope. The diagnostic arose in a compound read-only shell command whose final diff exited0; the individual diff-check exit was not captured separately. The observed error/ambiguous component result is treated fail-closed, not erased by the shell's final0.

No whitespace repair, checker rerun, further implementation, commit or push follows. correction_count=1; retries=0; candidate_commit=none; HEAD stays90daddb. Exactly13 allowlisted task paths are staged and preserved. This terminal evidence append remains unstaged, and the new correction receipt remains untracked; no index cleanup/restaging. Six prior receipts and all frozen implementation bytes are preserved. Planner owns fallback/path decision; no automatic second correction. T1-T8 independent acceptance, QA/Audit/Cherry and previous90daddb procedural Audit FAIL remain OPEN. The passing historical-canary correction is evidence, not a committed or accepted candidate.

## No-source-change packaging fallback — 2026-09-05 10:42:04 UTC

New Planner decision SHA-2568f4601b4de7c841f81abceea4ab34c3f0ef032bb848446428a66eadaa154d814 authorizes candidate packaging of the exact frozen bytes, not a second correction or test rerun. The prior terminal hold and sealed receipt fe5d59c736d9dddb51bb0881d27154fceb0208e5ca6b51bfcbfd133cfe66e944 remain unchanged. Entry dirty36743ec256537d21ad96c604cef9068c105182684cab1e04369bcbf1287e0d08 and all13 dual source/index pins,7 immutable receipts and11 logs matched.

Known warning retained: docs/PHASE4_TIMELINE_STATUS_READ_CONTRACT.md:14 has an extra blank line at EOF. Planner classifies ONLY this nonsemantic warning as nonblocking for candidate packaging. The previous individual diff-check exit is unknown; no diff-check PASS is claimed and no checker rerun or contract trimming is permitted. Independent QA/Audit may assess the warning. All9 earlier native command passes remain pinned evidence, not new executions or independent role verdicts.

Latest bounded state: PACKAGING_AUTHORIZED_WITH_DOCUMENT_WHITESPACE_WARNING. Reconcile this append-only Gate through exact named staging and add only docs/OUTCOME_TIMELINE_PACKAGING_FALLBACK_RECEIPT_20260905.md to the existing13 paths. Original unused ceiling: commit1/push1, no hook bypass or mutation retry. Final CANDIDATE_READY_WITH_DOCUMENT_WHITESPACE_WARNING may be reported only after exact candidate/tree/parent, source/index preservation and remote-ref readback. The receipt is committed as a precommit evidence record; its containing candidate pin and push result are reported separately after readback to avoid a self-referential commit claim.

source_changes_this_fallback=0 (product/test/Map/contract); evidence-only Gate append and packaging receipt are the only file edits. correction_count=1; test_reruns=0. Previous Audit FAIL remains OPEN. Fresh official QA, separate Release Audit and Cherry acceptance remain required; T1-T8 acceptance stays OPEN. No canonical promotion, runtime activation, hosted change, deployment or release. completionAuthority=false.

## Array-slot correction 1 — SAFE_HOLD before RED (2026-09-05)

Independent QA on aae42568715baac57e1034d37d1568870aeb5c55 returned NEEDS_REVISION for T2/A4: an ordinary events array index0 getter executed once and returned HTTP200, versus required trap0/generic503. QA receipt SHA-256 e9f63e3979f896d15c1ec306abbfbd3b37a3b3885bcce903e7e5a67d7799135a. The same expression exists in the parent; this is not established as a newly introduced regression or remote exploit. Prior Builder passes and packaging warning history above are unchanged; they do not override this QA failure.

New bounded handoff SHA-256 deaee0436eabb06ae37dc688e61e3898beddb2d20a7fa1ad3a2391c84479a983 authorized one correction under the same AP-4-READ-STATUS/T1-T8 and four-path allowlist. Entry candidate/tree/parent, isolated cwd/branch, registry163 current role/app/self singularity, clean tracked/index and seven immutable untracked receipts matched.

Latest Builder terminal: SAFE_HOLD_SETUP_EXECUTION_ERROR. A read-only canonical-root Git-state script using CommonJS require was invoked with node --input-type=module; native exit1, ReferenceError: require is not defined in ES module scope. This is an unexpected setup/invocation failure, NOT the planned accessor RED. Its same tool orchestration lacked exit gating and continued to add the ten-line TIMELINE-ARRAY-RED test and hash source/test before returning. This continuation is explicitly recorded as a process breach; it is not excused by the command being read-only. No product implementation, RED run, GREEN/stock check, staging, commit or push occurred. No invocation repair or retry follows.

CHECK planned: one sealed accessor RED on unchanged product, then descriptor-safe trap0/503 and valid controls, followed by all nine handoff commands sequentially. Actual EVIDENCE: RED NOT RUN; all nine GREEN commands NOT RUN; no new Builder candidate. Product SHA-256 remains bee12c9d7fae02adede94ad04b6166538f392afc70aba8df09274e1218774556; unexecuted test SHA-256 c6093a2a9d52fb3c7b26c6ee46e6d5e17874c6d80a6d658f0a4fc8e80ebe3572. Read-only preservation confirms 658 frozen tracked paths, seven old receipts, shared dependency packages/link and generated cache content/modes unchanged. Canonical-root state was not obtained by the failed command; no claim of successful root readback.

Recovery receipt: docs/OUTCOME_TIMELINE_ARRAY_SLOT_CORRECTION_RECEIPT_20260905.md. Preserve unpromoted test and append-only evidence, clean index, base HEAD and prior receipts. correction_attempts=1; product_corrections=0; retries=0; commit=0; push=0. Planner must choose a bounded fallback or new path before any resumption. T2/A4 remains unmet, T1-T8 acceptance remains OPEN, old90daddb Audit FAIL remains OPEN. No QA/Audit/Cherry acceptance, canonical promotion, runtime/hosted/deployment/release or completion authority.

## Native preflight fallback — first RED plan sealed (2026-09-05)

Authority e24af28ac6d7f14ea69bd6da86816589ebda8dbdf9c9876e946bc77e4b612b78 selects direct native Git preflight, not repaired Node-helper replay. The preceding setup hold and same-call continuation breach remain unchanged. Old hold receipt f3d583166731d34529c3b60a7cec9b0e23d7bf60b597a87a3846635752ec75f2 is now frozen and untracked. Same milestone/AP-4-READ-STATUS/T1-T8; four writable paths only, with new docs/OUTCOME_TIMELINE_ARRAY_NATIVE_FALLBACK_RECEIPT_20260905.md replacing the old receipt.

Native Git and shasum each returned exit0 before any dependent edit. Isolated HEAD/tree/parent and branch matched original handoff; index empty; exact predeclared test/Gate dirty; eight old receipts preserved. Canonical-root current HEAD516dc6759ef77a774c7246e4495e56d6b8491580/treec13324bd096427c149b7b1e6928628ac31a15141; complete native output streams hashed with pipefail: status58de2fc91b80d262aec497222b94941967c8285825525b643796623ee9549173, tracked diff629baff31f6304cdbd780f64cd66722c5ade3ee87b9bf7749c3aab44a09efdcb. Initial displayed status/diff text was truncated; these full-stream hashes, not that display, establish the preservation comparison. Proven ESM preservation method confirmed frozen tracked files/dependencies/caches unchanged; doctor registry163 healthy, current role/app/self match1.

CHECK: node --test --test-name-pattern=TIMELINE-ARRAY-RED server/outcome-chat-api.test.mjs
EXPECT: native exit1, exactly one selected failure: actual traps1/status200 vs expected traps0/status503. Setup/import/syntax failures are not accepted RED. Product SHA bee12c9d7fae02adede94ad04b6166538f392afc70aba8df09274e1218774556, unchanged regression SHA c6093a2a9d52fb3c7b26c6ee46e6d5e17874c6d80a6d658f0a4fc8e80ebe3572. No prior RED or stock command was executed. EVIDENCE: first RED pending; then one product correction and original nine sequential GREEN commands only if expected RED is observed. Inspect every native completion before any dependent action; no diagnostic-plus-edit orchestration. First unexpected failure stops with no repair/retry. Acceptance remains OPEN; completionAuthority=false.

## Native fallback — GREEN source and command plan sealed

First RED actual: native exit1, tests1/pass0/fail1, exact traps1/status200 versus traps0/status503; no setup/import/syntax error. Complete RED.json SHA47d9828e5c06d2f9541ed8845ab04ffd892bd5a0404c7e476bb3127c16ee1816. This is the unused first evaluation, not a replay of the setup failure.

Single surgical product correction rejects Proxy/nonplain arrays before reflection, requires exact dense enumerable own-data slots and no extra carrier properties, validates every slot before projecting into a fresh array without using the carrier's map/index/constructor/species/iterator. Empty/plain/frozen/sealed arrays remain supported. Existing event schemas/status/privacy/scope/order rules are unchanged.

Sealed API SHA256 d05e686fe48c75b4635e28d6518df46e62afcc2eedb8d9c6822a44021b5a5401; tests SHA256 f96a5b291156a6cf65484bf576311bd8ea160accf566b92e46ef2e422e167064. Existing RED assertion is unchanged; two added tests exercise hostile carriers and paired plain/detached/status/ordering controls. No source/test edit after this seal. Explicit cwd for every command: /Users/rosum/.codex/worktrees/aa51/OUTCOME. Existing dependency body and generated cache fingerprints recorded separately; no install/fetch/config edits.

Execute once each in this order; inspect prior completed native exit0 before starting the next:
1. node --test server/outcome-chat.test.mjs server/outcome-chat-api.test.mjs server/outcome-chat-postgres.test.mjs server/outcome-chat-hosted-runtime.test.mjs
2. node --test server/outcome-current-projection.test.mjs
3. npm test
4. npm run build
5. npm run test:security
6. npm run check:scope
7. npm run check:mutations
8. node --test scripts/*.test.mjs server/*.test.mjs
9. npm run test:package-model

EXPECT: all nine native exits0, complete outputs retained, frozen source/receipts/dependency body preserved. No summed overlapping counts. EVIDENCE: GREEN pending. Any unexpected failure or unclear execution seals this route with no test/harness/source repair or replay. Only all-pass plus exact preservation permits named four-path staging, individual new-delta diff-check, commit1/push1. Prior setup hold and old Audit FAIL remain recorded; T1-T8 acceptance remains OPEN. completionAuthority=false.

## Native fallback — Builder checks complete, packaging eligible

All nine planned commands completed once in declared order with native exit0. T1–T6 focused82/82 (including unchanged getter RED now trap0/generic503, hostile carrier controls and normal detached arrays); T7 current projection11/11; npm test frontend130/130 and server670/670; build exit0/1654 modules; T8 security75/75 plus snapshot/env checks; scope98 files; mutation matrices verified; broad762/762; package50/50. These overlapping counts are not summed. Full command outputs and sealed source pins are hashed in docs/OUTCOME_TIMELINE_ARRAY_NATIVE_FALLBACK_RECEIPT_20260905.md. No unexpected evaluation failure or source/test edits after GREEN sealing.

Preservation: 658 frozen tracked paths, all eight prior immutable/untracked receipts, QA receipt/harness/plan, dependency package/link body and canonical-root HEAD/tree/status/diff unchanged. Stock Vitest updated only its generated .vite/vitest results.json cache entry; 9592 dependency-body entries unchanged. This generated cache update is recorded separately, not claimed as total node_modules byte identity.

Latest local state: READY_FOR_CANDIDATE_PACKAGING_BUILDER_ONLY. Named four-path staging and new-delta native diff-check still precede the unused commit1/push1. The committed receipt is a precommit evidence record; containing candidate/tree/parent and exact diff-check/commit/push/remote readback are reported separately without self-referential commit claims. Earlier setup failure, same-call continuation breach, QA failure, canary/packaging history and inherited contract EOF warning remain unchanged. This Builder correction is not fresh independent QA or Audit. T1–T8 acceptance, old90daddb Audit FAIL, Cherry acceptance and release remain OPEN. completionAuthority=false.
