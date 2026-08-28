# OUTCOME Phase 3 · Observer Bridge Current-Canonical Promotion Builder Receipt

Status: **LOCAL_INTEGRATION_CANDIDATE_READY_ONLY**

This receipt fixes a conflict-free, product-edit-free local merge candidate. It does not transfer the prior QA/Audit verdicts to this new merge, activate Observer Bridge, mutate the private registry, close O2, deploy or release.

## Immutable graph

- dispatch carrier: `405546216fe905c62db3e85f4437ccafbc8bbc7d`
- dispatch tree: `cfc80c7812da55ad4748bce79dbf9cb72497d739`
- dispatch parent/current product source: `efec3fabc1302ad54a8b6539e2c7bfd6ce81da47`
- current product source tree: `f43b572a3b02934ba3d99604db37ce987d5ec7ca`
- audited Observer Bridge carrier: `b155249619c3443b54579553825d4d2e68b2d323`
- audited carrier tree: `c8d7e294e1726ce91fab16571b539184dd7c8760`
- audited carrier parent: `86107e95f359ef3c811117ee974ceb10e21693b4`
- merge base: `b8359691013501690a021709b974e463def6eea4`
- merge-base tree: `0d1787209a44f061b39124e1dd71f6876d4b75ef`
- handoff SHA-256: `7d99eb2ffbd509e076bccd2929699bdae9473fc6c81d8cec9145fb3a97a5eb90`
- Gate source SHA-256: `9b1a24eed76edab38b5d8f941734f4c49c55f75d7c1ff5a87dcf0cd23395ce64`

## Ordered merge candidate

- predicted merge tree: `9034583dc33dc57915307c3344d7237d1b7e9fa1`
- integration merge commit: `a9c13ed4fe496143396b71ccc00ada20497ebb38`
- actual merge tree: `9034583dc33dc57915307c3344d7237d1b7e9fa1`
- first parent: dispatch carrier `405546216fe905c62db3e85f4437ccafbc8bbc7d`
- second parent: audited carrier `b155249619c3443b54579553825d4d2e68b2d323`
- parent count: 2
- unmerged entries before/after: 0/0
- merge overlap paths: 0

The merge was created with normal Git merge ancestry. No squash, cherry-pick, fast-forward, conflict resolution or integration-authored product edit occurred.

## Provenance

- audited-lineage delta: 65 paths
- audited paths present in merge: 65/65
- audited path blob mismatches: 0
- dispatch-lineage delta: 14 paths
- dispatch paths present in merge: 14/14
- dispatch path blob mismatches: 0
- merge paths relative to first parent: 65
- imported migration/application/code/test/dependency bytes changed by integration author: 0

Prior evidence remains ancestry evidence only:

- QA carrier: `86107e95f359ef3c811117ee974ceb10e21693b4`, tree `5ae024366664436a3459692a0a3caedd3dee75df`
- QA report SHA-256: `8105dc077a24e5f03d84574527cf3f1bba7e100cfd26604d80b4d24cab89db0b`
- Release Audit carrier: `b155249619c3443b54579553825d4d2e68b2d323`
- Release Audit report SHA-256: `046fa45283dbcf950617e3ae82b4c527e9d5d031c59fa2f6b7e3b86be21357b6`

## Measured verification

- focused session binding: 89/89 PASS
- focused execution control: 31/31 PASS
- focused Observer Bridge API/hosted/runtime/Postgres/operations/domain: 101/101 PASS
- focused stable host: 34/34 PASS
- combined focused: 255/255 PASS
- configured `npm test`: frontend 90/90 and Node 334/334, combined 424/424 PASS
- broader `node --test scripts/*.test.mjs server/*.test.mjs`: 364/364 PASS
- production build: PASS, 1,652 modules transformed
- security: 54/54 PASS; prohibited stable disclosures 0; Gate evidence fields 0
- public mode: 4/4 PASS
- mutation boundary: local 32/32 returned 405; API 28/28 returned `read_only`; empty-page boundary 0/4
- client boundary: Vercel Git metadata leaks 0; sealed Package leaks 0/6
- scope: PASS, 53 product/runtime/test files, no unapproved provider dependency
- runbook: PASS
- public boundary: API/HTML/bundle/rendered-UI prohibited identifiers 0
- `git diff --check`: PASS

Dependency-bearing commands used the canonical lockfile installation through a temporary ignored worktree symlink. It was removed after verification. A component-count-only invocation made after the first removal failed dependency resolution; the exact groups were then rerun with the same canonical installation and passed 89/89, 31/31, 101/101 and 34/34 without source change.

## Current authority and runtime boundary

A read-only public-safe check found the current OUTCOME Planner private binding at version 2, alias `planner-primary`, status `blocked`, latest reason `adapter_unreachable`, activity null; registry doctor remained PASS at revision 28, exact mode `0600`, lock clear. No private registry mutation occurred in this integration.

- Observer Bridge remains disabled by default and has no hosted persistence adapter supplied.
- O2 remains `OPEN/LOCKED`.
- Phase 3 remains `17/43`.
- T1–T7 remain open.
- `EXTERNAL_OUTCOME_COMPLETE=false`.
- fresh QA, separate fresh Release Audit and Cherry acceptance remain required for this merge candidate.

## Mutation ledger and rollback

- integration-authored product/dependency/migration/config/environment changes: 0
- provider/session/thread operations: 0
- private registry operations: 0
- Supabase/database/credential/network/runtime activation: 0
- push/deploy/release/external messages or mutations: 0
- rollback: first revert the later evidence carrier; then revert merge `a9c13ed4fe496143396b71ccc00ada20497ebb38` with mainline 1 and verify the resulting tree equals dispatch tree `cfc80c7812da55ad4748bce79dbf9cb72497d739`

`false_completion_count=7`

1. A conflict-free merge is not fresh QA.
2. Prior lineage QA does not transfer to this merge commit.
3. Prior lineage Release Audit does not audit this merge commit.
4. Disabled local code is not hosted activation or signed observation.
5. Planner `blocked` is not active routing or NOW.
6. O2, T1–T7 and Phase progress remain open.
7. This candidate is not Cherry acceptance, deployment, release or external completion.

## learning_receipt

- Zero-overlap ancestry plus blob-by-blob comparison is stronger provenance evidence than a conflict-free merge alone.
- Current-base regression counts must be remeasured because integrating the execution-control lineage increased Node and scope totals.
- Dependency harness availability must be distinguished from candidate behavior; rerun the exact command after restoring the unchanged lockfile installation before classifying a regression.
