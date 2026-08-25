# OUTCOME Phase 3 · Private Session Registry Gates

Outcome: 실제 기존 역할 세션을 project-scoped private registry에 안전하게 연결하고 lifecycle·redaction·audit를 candidate 증거로 고정한다.

- [ ] R1: project, role, provider, private locator, binding version, status, bound/revoked timestamps를 가진 schema와 불변조건이 구현된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] R2: project+role당 active binding 최대 1개와 compare-and-swap bind/rebind가 concurrency test로 증명된다.
  PROVES: test
  EVIDENCE: pending
- [ ] R3: missing, duplicate, cross-project, unsupported-role, stale-version binding이 fail closed한다.
  PROVES: test
  EVIDENCE: pending
- [ ] R4: raw session ID, provider locator, credential이 public API·HTML·bundle·log에 0건 노출된다.
  PROVES: security
  EVIDENCE: pending
- [ ] R5: bind, revoke, replace의 actor·reason·before/after가 immutable audit history로 재현된다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] R6: disable/rollback 후 write가 차단되고 기존 public-safe 연결 상태와 audit evidence가 보존된다.
  PROVES: rollback
  EVIDENCE: pending

ABANDON: 이 Stage는 새 provider session 생성, 실제 업무 dispatch, 공개 credential, Phase 3 entry·completion을 수행하지 않는다.
