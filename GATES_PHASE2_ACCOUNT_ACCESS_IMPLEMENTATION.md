# Phase 2 · Account Access Implementation Gates

Outcome: 승인된 K1-K6 계약을 벗어나지 않는 Cherry-only authenticated read-only workspace candidate와 재현 가능한 증거를 만든다.

- [ ] I1: exact Builder ticket, base commit, allowed paths와 non-scope가 고정된다.
  PROVES: architecture
  EVIDENCE: base 0f88e71d2c8c/tree 65c419a440b4 verified against origin/main; isolated detached worktree and allowed-path diff recorded in docs/PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION_EVIDENCE.md.
- [ ] I2: public page/API/health와 mutation 405/redaction/receipt 동작이 회귀 없이 보존된다.
  PROVES: evidence
  EVIDENCE: public boundary prohibited hits 0; mutation matrix 32/32=405 and API read_only JSON 28/28; security suite 28 passed; stable GET contract remains sanitized and private workspace denies when disabled.
- [ ] I3: Google primary, Apple linked access, email-code fallback의 provider-neutral auth boundary와 session/logout/revoke/recovery failure states가 red-first tests로 구현된다.
  PROVES: implementation
  EVIDENCE: provider-neutral synthetic auth tests cover Google primary, Apple linked-only, email-code recovery, seven-day maximum, logout, revoke, expiry and provider outage; 15 account Node tests passed.
- [ ] I4: server-derived owner/workspace membership, two-project allowlist, RLS contract와 forged/cross-workspace deny tests가 구현된다.
  PROVES: security
  EVIDENCE: BLOCKED for actual Postgres/RLS execution because Docker daemon is unavailable and no service start was authorized. Static migration contract and two-workspace synthetic deny tests pass but do not close I4.
- [ ] I5: append-only snapshot/current pointer, migration, retention/export/deletion/restore contract가 synthetic fixtures로 검증된다.
  PROVES: implementation
  EVIDENCE: append-only/current-pointer validation, unchanged evidence time under session activity, 30-day deletion hook and redacted export pass synthetic tests; migration and fixture SHA-256 receipts are recorded in the implementation evidence.
- [ ] I6: rate limit, redacted metrics/alerts, cost thresholds, incident receipt와 fail-closed rollback binding이 검증된다.
  PROVES: evidence
  EVIDENCE: private-path 120/10m rate, 6/project/hour sync cap, idempotency/concurrency, 512 KiB measured-fixture payload cap, $40/$60/$75 states, redacted incident and rollback binding pass synthetic tests.
- [ ] I7: MacBook/mobile의 login/loading/empty/stale/conflict/unavailable/session-expired/access-denied/safe-degraded states와 accessibility가 검증된다.
  PROVES: test
  EVIDENCE: account browser passed MacBook/mobile for nine settled states plus loading, 200% zoom, keyboard focus, reduced motion, touch >=44 px and zero overflow/intersection; Korean-first static state tests 3 passed.
- [ ] I8: exact candidate commit/tree/asset, tests, migrations, synthetic fixtures, rollout/rollback과 changed-files receipt가 immutable handoff로 전달된다.
  PROVES: evidence
  EVIDENCE: immutable candidate commit/tree/asset is issued in the post-commit Builder handoff; changed files, commands, migrations, rollout, rollback and limitations are recorded in docs/PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION_EVIDENCE.md. Result remains BLOCKED, not QA or release authority.

ABANDON: production provider/resource/secret/database/domain mutation, additional projects/users, write features, session relay/dispatch와 release는 포함하지 않는다.
