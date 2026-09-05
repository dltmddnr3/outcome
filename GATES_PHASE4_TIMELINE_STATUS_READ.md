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
