# Phase 2 · Account Access UX QA Correction Gates

Outcome: fresh QA의 세 blocker를 최소 변경으로 수정하고, prior PASS 범위를 보존한 새 immutable Builder candidate를 fresh re-QA에 전달한다.

- [ ] B1: ready private response의 Cherry Note/OUTCOME projections를 실제 hierarchy와 current-vs-selected가 구분되는 UI로 렌더링한다.
  EVIDENCE: pending
- [ ] B2: real OAuth 없이도 synthetic/provider-neutral adapter를 통해 login transition과 ready-state logout journey를 viewport에서 실행 가능하게 한다.
  EVIDENCE: pending
- [ ] B3: mobile 390×844와 375×812의 200% CSS zoom에서 horizontal overflow가 0이며 내용·접근성을 보존한다.
  EVIDENCE: pending
- [ ] B4: account browser가 ready hierarchy, project switching, current-vs-selected, login/logout, mobile 200% zoom과 prior 10 states를 red-first/positive assertions로 검증한다.
  EVIDENCE: pending
- [ ] B5: public 405/redaction/disabled private contract, PostgreSQL/RLS, stable hierarchy, responsive/accessibility와 full regression이 유지된다.
  EVIDENCE: pending
- [ ] B6: exact correction commit/tree/asset, changed paths, tests, rollout/rollback과 limitations가 immutable handoff로 전달된다.
  EVIDENCE: pending

ABANDON: assertion 완화, fake OAuth/provider success, real provider/resource/secret/database/domain mutation, deploy/push, QA self-pass, Release Audit, Cherry acceptance와 Phase completion은 포함하지 않는다.
