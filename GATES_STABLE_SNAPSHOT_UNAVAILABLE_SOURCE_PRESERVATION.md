# Stable Snapshot Unavailable Source Preservation Gates

Outcome: 새 deployment snapshot을 캡처할 때 외부 Package source가 일시적으로 unavailable이면 검증된 마지막 project projection과 그 원래 관측 시각을 보존하고, 현재 접근 가능한 OUTCOME source만 새 근거로 갱신한다.

- [ ] S1: prior valid project + current unknown at the same registered slot preserves the prior projection byte-semantics and original observed time.
  PROVES: implementation
  EVIDENCE: pending
- [ ] S2: current valid project always replaces its prior slot, so OUTCOME current Stage/Gate changes are captured.
  PROVES: implementation
  EVIDENCE: pending
- [ ] S3: no prior snapshot, project-count drift, or prior unknown never fabricates a valid project and remains fail-closed unknown.
  PROVES: security
  EVIDENCE: pending
- [ ] S4: capture output remains sanitized with no raw Gate evidence, path, secret or session identifier.
  PROVES: security
  EVIDENCE: pending
- [ ] S5: red-first focused tests, package model, stable host/browser, security, full tests and Vercel build pass; evidence records exact candidate and limitations.
  PROVES: test
  EVIDENCE: pending

ABANDON: this correction does not repair or mutate the external Cherry Note source, infer freshness, create provider resources, enable private access, deploy, release or close any OUTCOME Gate by implication.
