# OUTCOME Phase 3 · Execution Control Plane Local Foundation Gates

Outcome: OUTCOME의 Package, role binding, instruction lifecycle, session rotation, evidence separation과 continuous-next-work 규칙을 실제 provider나 runtime mutation 없이 하나의 deterministic local/synthetic candidate로 증명한다.

- [x] F1: 단일 권한표와 exact state ownership이 코드 계약으로 보존되고 projection이 authority를 획득하지 않는다.
  CHECK: test -f server/outcome-execution-control-plane.mjs && node --test server/outcome-execution-control-plane.test.mjs
  EXPECT: tests pass with state-owner and authority-denial cases
  EVIDENCE: integration carrier `71ce13957e0415142bb11f5568c838f25a212bcd`; fresh QA `91b30674b2da30cfc4e786a6116b99929465a64a`; focused 31/31 and hostile family 16/16 PASS.

- [x] F2: `project_id + role` logical address가 current binding version을 snapshot하고 wrong/stale/replaced/cross-project target을 no-mutation으로 거절한다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs
  EXPECT: role-address and binding-version matrix passes
  EVIDENCE: fresh integration QA adjacent hostile probe 9/9 PASS; Release Audit hostile probe 8/8 PASS.

- [x] F3: `start_validated → dispatch_observed → execution_started → role_result_recorded → handoff_accepted|rejected`가 append-only이고 disallowed transition·receipt 없는 전달 성공·automatic retry가 거절된다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs
  EXPECT: lifecycle transition and retry-denial matrix passes
  EVIDENCE: focused 31/31 PASS on exact integration carrier; retry identity, chain, restart and replay hostile probes PASS.

- [x] F4: rotation recommendation, minimal checkpoint, successor verification과 CAS replace가 분리되고 `STARTED + CONTINUITY_READY` 전 archive·binding switch가 거절된다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs
  EXPECT: rotation safety and predecessor preservation matrix passes
  EVIDENCE: fresh QA and separate Release Audit reproduced rotation uniqueness, ordering and post-confirmation state invariants; no live rotation executed.

- [x] F5: lightweight·standard·high-risk 분류와 next-work eligibility가 정상 경로 사람 개입 0을 유지하고 중요한 Cherry boundary 또는 exact conflict만 해당 workstream을 `SAFE_HOLD`한다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs
  EXPECT: proportional policy and independent-workstream matrix passes
  EVIDENCE: focused policy matrix PASS; local promotion remained automatic within authority and kept live/deploy/release boundaries locked.

- [x] F6: duplicate key·attempt·event, reentry, clock/error, response materialization과 restart replay가 partial mutation·ID/sequence consumption·duplicate execution을 만들지 않는다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs
  EXPECT: idempotency, atomicity and replay matrix passes
  EVIDENCE: all prior hostile families 16/16 plus independent hostile probes PASS; duplicate execution observed 0.

- [x] F7: public-safe projection에서 raw locator, private ID/digest, prompt/result, path, credential, progress, Gate/approval/release/dispatch authority hit가 0이다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs && npm run check:mutations && npm run test:security
  EXPECT: focused privacy matrix passes and prohibited serialized hits equal 0
  EVIDENCE: security 29/29 PASS, mutation matrices local 32/32 and API 28/28 PASS, prohibited public identifier hits 0, external mutations 0.

- [x] F8: focused·package·frontend·Node·build·scope 검증과 exact allowed-path diff가 통과하고 Builder immutable receipt가 candidate commit/tree/parent, counts, rollback, external mutation 0을 기록한다.
  CHECK: node --test server/outcome-execution-control-plane.test.mjs && npm run test:package-model && npm test && node --test scripts/*.test.mjs server/*.test.mjs && npm run build && npm run check:scope && git diff --check
  EXPECT: all commands pass and candidate diff contains only authorized paths
  EVIDENCE: exact current-base integration diff 3 paths; focused 31/31, configured 360/360, broad Node 300/300, Package 48/48, security 29/29, build 1,652 modules PASS. Local promotion reached audited `00fb9820428787ab0e6a7b96e93506c37b05b463`; pre-existing dirty fingerprint stayed `b9f33c211c2d64d5fab08282a5cb34e57ae0bffd1fd3e7a4d58ec5990ad3d708` across 79 paths.

## Completion boundary

F1–F8은 local/synthetic foundation candidate만 판정한다. `ABANDON`은 Stage PASS가 아니라 `SAFE_HOLD / contract_rescope_required`다. 이 Gate는 O2, T1–T7, E1–E6, actual binding, provider observation/dispatch, session creation/archive, UI/runtime/API/database wiring, QA, Audit, Cherry acceptance, deploy, release 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
