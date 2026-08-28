# OUTCOME Phase 3 · Observer Bridge Current-Canonical Promotion · Builder Handoff

Status: **BUILDER AUTHORIZED / LOCAL INTEGRATION ONLY / EXTERNAL MUTATION LOCKED**

## Outcome

현재 OUTCOME의 실행제어·Planner binding 계보를 그대로 보존하면서, 별도 계보에서 fresh QA와 separate Release Audit을 통과한 Observer Bridge carrier를 한 번의 명시적 merge로 통합한다. 이 작업은 이미 검증된 경계를 현재 canonical 후보에 승격하는 것이며 새 adapter, provider introspection 또는 실제 원격 관측을 구현하지 않는다.

## Immutable inputs

- current product source commit: `efec3fabc1302ad54a8b6539e2c7bfd6ce81da47`
- current product source tree: `f43b572a3b02934ba3d99604db37ce987d5ec7ca`
- audited Observer Bridge carrier: `b155249619c3443b54579553825d4d2e68b2d323`
- audited Observer Bridge carrier tree: `c8d7e294e1726ce91fab16571b539184dd7c8760`
- prior Observer Bridge integration QA: `86107e95f359ef3c811117ee974ceb10e21693b4`
- prior Observer Bridge integration Release Audit: `b155249619c3443b54579553825d4d2e68b2d323`
- preflight merge-tree from the product source and audited carrier: `5b86106d79666b3e034b6161cbd3ced259081c82`
- current Planner binding receipt: `docs/PHASE3_OUTCOME_PLANNER_CONFIRMED_REMOTE_BINDING_RECEIPT.md`

The dispatch carrier commit and tree are supplied with the Builder message after this documentation-only handoff is committed. Builder must start from that exact clean carrier in an isolated worktree and independently recompute the merge tree before mutation.

## Authorized Builder work

1. Create an isolated clean worktree at the exact dispatch carrier.
2. Verify both immutable inputs, ancestry, current session-binding/execution-control bytes and the prior QA/Audit reports.
3. Run `git merge-tree --write-tree <dispatch-carrier> b155249...` and record the predicted tree.
4. If and only if the merge is conflict-free, merge the audited carrier with the dispatch carrier as first parent and the audited carrier as second parent. Do not squash or cherry-pick the audited lineage.
5. Make no integration-authored product edit. Add only:
   - evidence updates to `GATES_PHASE3_OBSERVER_BRIDGE_CURRENT_CANONICAL_PROMOTION.md`; and
   - `docs/PHASE3_OBSERVER_BRIDGE_CURRENT_CANONICAL_PROMOTION_BUILDER_RECEIPT.md`.
6. Verify focused session binding, execution control, Observer Bridge, stable-host/API behavior, then the full tests, production build, security/public/mutation/scope/runbook checks and `git diff --check`.
7. Return one immutable candidate commit/tree/parents, exact changed-path provenance, measured results, rollback and `false_completion_count`.

## Acceptance

- merge has exactly two ordered parents: dispatch carrier first, audited Observer Bridge carrier second;
- independently predicted and actual merge trees match; unmerged entries are zero;
- all imported non-handoff paths trace byte-for-byte to the audited carrier; current execution-control and confirmed Planner-binding paths remain intact;
- integration-authored product, dependency, migration, environment, secret, runtime-activation and external-operation changes are zero;
- focused and full verification is green on the merged candidate;
- private raw locator, credential, prompt/result, provider/session/thread/turn identifiers and absolute local paths do not enter new runtime/public surfaces;
- current OUTCOME Planner binding remains `blocked / adapter_unreachable` until actual signed observation exists;
- O2 remains `OPEN/LOCKED`, Phase 3 remains `17/43`, T1–T7 remain open and `EXTERNAL_OUTCOME_COMPLETE=false`.

## Stop conditions

Stop as `SAFE_HOLD` without resolution or retry if:

- either input identity or dispatch carrier differs;
- the isolated starting worktree is not clean;
- merge conflict, provenance ambiguity, deleted current-lineage work or test regression occurs;
- the merge would require a product edit, dependency change, secret/environment mutation or runtime activation;
- any live provider/session, database, credential, network, deployment, push, release or external operation becomes necessary.

## Forbidden

- no live session read/resume/start/message/listener operation;
- no private registry mutation;
- no Supabase project, billing, credential, database or migration application;
- no Vercel/runtime/environment/feature activation;
- no push, deploy, release, external message or Cherry acceptance;
- no O2, T1–T7, QA, Audit, progress or completion promotion by inference;
- do not open, edit, stage or commit `docs/ROADMAP 2.md`;
- do not stage or commit unrelated dirty/user-owned paths from the shared canonical worktree.

## Rollback

Before external activation, rollback is local and history-preserving: revert the Builder receipt carrier first, then revert the integration merge with mainline 1. Verify the resulting tree equals the exact dispatch carrier tree. Do not reset, delete evidence history or rewrite branches.

## ABANDON

This handoff authorizes only a local Builder-owned merge and verification candidate. It does not authorize fresh QA, fresh Release Audit, actual remote observation, hosted activation, O2 closure, routing, Supabase, deployment, push, release, Cherry acceptance or external completion.
