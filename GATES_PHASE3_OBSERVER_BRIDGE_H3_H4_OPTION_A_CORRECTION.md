# Phase 3 Observer Bridge · H3-H4 Option A Correction Gates

Outcome: Cherry가 승인한 trusted private backend 경계에서 실패한 H3-H4 후보를 로컬로 교정하고 F2-F6을 실행 증거로 검증하되 원격 적용과 O2를 잠근다.

- [x] A1: exact Planner authorization commit/tree와 결정·QA hash가 일치한다.
  CHECK: test "$(git show -s --format=%T 7ab8c7619872b03ebc16dafe2449dc75a7f3edb7)" = "5f622360878ca15865d8ac871966b5fa508cd67e" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_FRESH_QA_B0AEF3A.md | awk '{print $1}')" = "389ca894e30c385a0cf5d867f34620d370ec54d39e8cfaf9b3f4023d448568b3" && echo A1_PASS
  EXPECT: byte-identical authorization; drift 0.
  EVIDENCE: authorization commit/tree, direct parent, three authorization document hashes, and failed-candidate pin were verified before the isolated worktree mutation; receipt immutable boundary records the values.
- [x] A2: mutable custom GUC가 권한 증명에서 제거되고 전용 bridge backend, anon, authenticated viewer 경계가 정확히 분리된다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'mutable GUC.*RED.*GREEN|GUC substitution.*RED.*GREEN' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'NOLOGIN.*NOBYPASSRLS' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && echo A2_PASS
  EXPECT: substitution deny; anon deny; viewer exact read; backend exact scoped operations.
  EVIDENCE: focused RED 5/5 reproduced GUC substitution; GREEN PGlite catalog/effective-role tests prove one NOLOGIN NOBYPASSRLS backend, anon deny, viewer projection-only access, and custom-GUC authority hit 0.
- [x] A3: 모든 operations SQL 경로가 최소 grant/policy에서 동작하고 다른 workspace/project/role/binding/source/key와 unrelated schema는 거부된다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'activate.*append.*rotate.*revoke.*tombstone.*manifest.*restore' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'effective role.*forced RLS|forced RLS.*effective role' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && echo A3_PASS
  EXPECT: declared allows only; every cross-scope/unrelated action denied.
  EVIDENCE: actual PGlite effective role + forced RLS matrix executes activate/append/rotate/revoke/tombstone/manifest/restore 7/7; mixed scope and unrelated schema probes deny.
- [x] A4: immutable versioned manifest와 transactional tombstone coverage가 restore를 fail closed한다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'missing.*conflicting.*stale.*incomplete.*inaccessible' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'tombstone.*coverage.*transaction|transaction.*tombstone.*coverage' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && echo A4_PASS
  EXPECT: exact valid restore only; invalid cases zero read-resume and zero raw resurrection.
  EVIDENCE: immutable manifest and receipt bind schema/durable revision plus exact tombstone count/coverage; missing/conflicting/stale/incomplete/inaccessible probes and raw resurrection attempts fail closed.
- [x] A5: opaque random evidence identity, exact future-skew boundary, tombstone privacy residue가 증명된다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'opaque random|UUIDv7' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'below.*at.*above|below/at/above' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'raw resurrection.*0|no raw resurrection' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && echo A5_PASS
  EXPECT: no contiguity claim; future over-boundary denied; reconstructive residue/raw resurrection 0.
  EVIDENCE: random UUIDv7-shaped IDs, failed-transaction non-publication, below/at/above 5000 ms skew, raw source/key purge, restore re-delete, and raw resurrection 0 pass.
- [x] A6: focused·security·package·full regression·build·scope와 public boundary가 통과한다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'security.*PASS' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'build.*PASS' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q '405 read_only' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && echo A6_PASS
  EXPECT: all pass; anonymous private presence 0; public mutations exact `405 read_only`.
  EVIDENCE: focused 23/23, domain 69/69, package 39/39, security 29/29, npm 301/301, full Node 240/240, build/scope/runbook/diff PASS; mutation boundary 32/32 exact 405 and API 28/28 read_only.
- [x] A7: immutable Builder candidate와 receipt가 exact hashes, commands/counts, rollback, residual risk와 external operation 0을 기록한다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'HOSTED_CODE_CANDIDATE_READY_ONLY' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'external operation.*0|external mutations.*0' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && rg -q 'residual risk' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md && echo A7_PASS
  EXPECT: candidate ready only; no self-promotion.
  EVIDENCE: semantic commit/tree, migration hash, RED/GREEN counts, seven paths, rollback, accepted residual risk, external operation 0, false_completion_count, and learning receipt are pinned in the Builder receipt.
- [ ] A8: fresh UX & Product QA가 동일 immutable candidate를 hostile read-only로 검증한다.
  CHECK: test -n "$(find docs -maxdepth 1 -name 'PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_FRESH_QA_*.md' -print -quit)" && rg -q 'PASS_INDEPENDENT_QA_ONLY' docs/PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_FRESH_QA_*.md && echo A8_PASS
  EXPECT: `PASS_INDEPENDENT_QA_ONLY` or exact FAIL/BLOCKED.
  EVIDENCE: pending
- [ ] A9: 별도 fresh Release Audit가 동일 promoted evidence carrier와 privacy/runtime/rollback/scope를 검증한다.
  CHECK: test -n "$(find docs -maxdepth 1 -name 'PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_RELEASE_AUDIT_*.md' -print -quit)" && rg -q 'PASS_RELEASE_AUDIT_ONLY' docs/PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_RELEASE_AUDIT_*.md && echo A9_PASS
  EXPECT: `PASS_RELEASE_AUDIT_ONLY` or exact FAIL/BLOCKED.
  EVIDENCE: pending
- [x] A10: 원격 DB/provider/deploy/O2/progress/acceptance/release는 닫히지 않는다.
  CHECK: rg -q 'O2 remains `OPEN/LOCKED`' docs/PHASE3_OBSERVER_BRIDGE_OPTION_A_AUTHORITY_AMENDMENT.md && rg -q 'Phase 3 remains `17/43`' docs/PHASE3_OBSERVER_BRIDGE_OPTION_A_AUTHORITY_AMENDMENT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_OPTION_A_AUTHORITY_AMENDMENT.md && echo A10_PASS
  EXPECT: external mutations 0; O2 `OPEN/LOCKED`; Phase 3 `17/43`; `EXTERNAL_OUTCOME_COMPLETE=false`.
  EVIDENCE: external mutation ledger is 0; amendment and receipt keep O2 OPEN/LOCKED, Phase 3 17/43, and EXTERNAL_OUTCOME_COMPLETE=false.

## ABANDON

**ABANDON:** 이 Gate의 로컬 candidate·QA·Audit 완료도 원격 migration, hosted wiring, real two-viewer O2, 진행률, Cherry acceptance, deploy, release 또는 external completion이 아니다.

**ABANDON:** A8은 Builder 권한 밖의 fresh UX & Product QA 전용 Gate이므로 이 candidate에서는 의도적으로 미충족이다.

**ABANDON:** A9는 별도 fresh Release Audit 전용 Gate이므로 이 candidate에서는 의도적으로 미충족이다.
