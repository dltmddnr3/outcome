# Phase 2 · Account Access Implementation Gates

Outcome: 승인된 K1-K6 계약을 벗어나지 않는 Cherry-only authenticated read-only workspace candidate와 재현 가능한 증거를 만든다.

- [x] I1: exact Builder ticket, base commit, allowed paths와 non-scope가 고정된다.
  PROVES: architecture
  EVIDENCE: base 0f88e71d2c8c/tree 65c419a440b4 verified against origin/main; isolated detached worktree and allowed-path diff recorded in docs/PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION_EVIDENCE.md.
- [x] I2: public page/API/health와 mutation 405/redaction/receipt 동작이 회귀 없이 보존된다.
  PROVES: evidence
  EVIDENCE: public boundary prohibited hits 0; mutation matrix 32/32=405 and API read_only JSON 28/28; security suite 28 passed; stable GET contract remains sanitized and private workspace denies when disabled.
- [ ] I3: Google primary, Apple linked access, email-code fallback의 provider-neutral auth boundary와 session/logout/revoke/recovery failure states가 red-first tests로 구현된다.
  PROVES: implementation
  EVIDENCE: server/provider-neutral synthetic auth tests and 17 account Node tests passed, but fresh QA `QA-ACC-002` proved the viewport login controls are inert and the ready UI has no logout journey. Reopened pending an adapter-driven synthetic UI transition and fresh re-QA.
- [x] I4: server-derived owner/workspace membership, two-project allowlist, RLS contract와 forged/cross-workspace deny tests가 구현된다.
  PROVES: security
  EVIDENCE: exact pinned migration executes on PGlite 0.5.7/PostgreSQL 18.3 with actual authenticated/anon roles, forced RLS on eight tables, one-subject/one-workspace v1 uniqueness, owner-only reads and duplicate/anonymous/unknown/revoked/write denial. This closes local I4 implementation proof only; it is not Supabase or Clerk preview proof.
- [x] I5: append-only snapshot/current pointer, migration, retention/export/deletion/restore contract가 synthetic fixtures로 검증된다.
  PROVES: implementation
  EVIDENCE: append-only/current-pointer validation, unchanged evidence time under session activity, 30-day deletion hook and redacted export pass synthetic tests; migration and fixture SHA-256 receipts are recorded in the implementation evidence.
- [x] I6: rate limit, redacted metrics/alerts, cost thresholds, incident receipt와 fail-closed rollback binding이 검증된다.
  PROVES: evidence
  EVIDENCE: private-path 120/10m rate, 6/project/hour sync cap, idempotency/concurrency, 512 KiB measured-fixture payload cap, $40/$60/$75 states, redacted incident and rollback binding pass synthetic tests.
- [ ] I7: MacBook/mobile의 login/loading/empty/stale/conflict/unavailable/session-expired/access-denied/safe-degraded states와 accessibility가 검증된다.
  PROVES: test
  EVIDENCE: normal-size account/stable browser checks passed, but fresh QA `QA-ACC-001` found ready payload projects/hierarchy discarded and `QA-ACC-003` measured 250 px mobile overflow at 200% zoom. Reopened pending rendered hierarchy/current-vs-selected proof and mobile zoom correction.
- [ ] I8: exact candidate commit/tree/asset, tests, migrations, synthetic fixtures, rollout/rollback과 changed-files receipt가 immutable handoff로 전달된다.
  PROVES: evidence
  EVIDENCE: prior immutable candidate `f7d3467ecf9f` was promoted and then independently rejected by report-only QA commit `ed7613f3109c` with three blockers. Reopened until an exact correction candidate and fresh re-QA handoff exist.

ABANDON: production provider/resource/secret/database/domain mutation, additional projects/users, write features, session relay/dispatch와 release는 포함하지 않는다.
