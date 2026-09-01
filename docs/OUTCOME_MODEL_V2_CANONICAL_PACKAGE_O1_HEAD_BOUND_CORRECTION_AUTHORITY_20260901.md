# OUTCOME Model v2 canonical package O1 — HEAD-bound correction authority

Status: **CHERRY AUTHORIZED FORWARD CORRECTION, FRESH QA, RELEASE AUDIT, AND ONE NEW FINAL DOGFOOD ATTEMPT**

Cherry's exact authority on 2026-09-01 KST:

> 사용자 작업 트리 바이트를 변경하지 않는 HEAD-bound canary 전진 수정, 독립 QA·Release Audit, 통과 후 새로운 최종 dogfood 1회 실행을 승인합니다. 외부 활성화·배포·출시는 제외합니다.

## Trigger and preserved state

- Accepted promotion carrier/tree/parent: `5ac7960771f228d76956c0dc236907176d9748df` / `4268d1678148c62c9869ca1e081da7dbf446221a` / audited carrier `e912c61ac718165e864a5e89478fa4690d11aa72`.
- The first authorized final canary ran exactly once and failed closed as `cold_compile_required/source_digest_drift`; consumption, callback, receipt, duplicate, retry and false completion were all `0`.
- Drift was limited to preserved user-owned working-tree Contract/Map bytes: expected HEAD digests `c25e8f39...` / `da2b8c47...`, working-tree digests `36860ad7...` / `37fbe565...`.
- Active root is the accepted promotion carrier on `codex/hp1-session-bearer`; unrelated dirty baseline remains `396` / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`; staged entries and operation residue are zero.

## Authority boundary

Builder may create a minimal isolated correction candidate that makes the production canary's default canonical source carrier the exact current Git `HEAD` tree, without reading substituted working-tree bytes. Explicit test-only source-root injection must remain fail-closed and cannot become a production fallback. User-owned working-tree Contract/Map bytes and modes must not change.

The correction requires fresh independent UX & Product QA and separate Release Audit before promotion. Only after both PASS may the already-authorized new single final dogfood attempt be executed from the verified active root. This authority does not permit automatic retry, replay of the consumed attempt, dirty-file quarantine for canary input, conflict synthesis, registry/provider/database/credential/environment mutation, Preview, Production, external activation, deployment, release or Phase completion.
