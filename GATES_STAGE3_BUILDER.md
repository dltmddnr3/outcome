# OUTCOME Stage 3 Builder gates

Outcome: OUTCOME is the single standalone dashboard source and provides a locally verifiable, authenticated read-only remote-feedback candidate whose Mac Mini collector fails closed.

- [x] B1: Only dashboard UI, collector/domain logic, minimal runtime, tests, styles, and package configuration exist in OUTCOME.
  CHECK: npm run check:scope
  EXPECT: exit 0
  EVIDENCE: `scope PASS: 10 product/runtime/test files; no Desk, Slack, relay, or provider dependencies`.

- [x] B2: The standalone route and API start without Desk authentication, navigation, provider, Slack, relay, or Cherry Note iOS dependencies.
  CHECK: npm run test:runtime
  EXPECT: exit 0
  EVIDENCE: standalone Node runtime tests PASS 7/7; runtime imports only the collector and Node standard library.

- [x] B3: Cherry Note hierarchy and Stage 33 semantics retain migration parity.
  CHECK: npm run test:dashboard
  EXPECT: exit 0
  EVIDENCE: dashboard semantic parity tests PASS 2/2; nine Korean Gate groups, sequence/current/next/acceptance labels retained.

- [x] B4: Unauthenticated clients receive no project, NOW, Gate, session, or freshness data.
  CHECK: npm run test:security
  EXPECT: exit 0
  EVIDENCE: unauthenticated API returns 401 without project data; unauthenticated HTML contains no Cherry Note, Gate, or asset bundle reference.

- [x] B5: Authenticated remote payloads exclude local paths, credentials, raw rollout text, task or turn IDs, full hashes, and mutation controls.
  CHECK: npm run test:redaction
  EXPECT: exit 0
  EVIDENCE: collector redaction probe and authenticated serialized-payload probe PASS.

- [x] B6: Collector absence and stale snapshots are explicit and cannot appear as fresh success.
  CHECK: npm run test:collector
  EXPECT: exit 0
  EVIDENCE: collector tests PASS for `offline → live unknown` and evidence older than 180 seconds → `stale`.

- [x] B7: Production build and full test suite pass.
  CHECK: npm test && npm run build
  EXPECT: exit 0
  EVIDENCE: frontend 2/2 and Node 13/13 PASS; Vite production build PASS with 1581 modules.

- [x] B8: Desktop and mobile checks show no horizontal overflow or detail overlap and preserve current/next semantics.
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: system Chrome checks at 1440x900 and 390x844: overflow=0, overlap=0, current=true, next=true.

- [x] B9: Private HTTPS activation, identity, secrets, monitoring, and rollback are documented without anonymous access.
  CHECK: npm run check:runbook
  EXPECT: exit 0
  EVIDENCE: `docs/REMOTE_ACCESS.md`; runbook check PASS. Tailscale Funnel and anonymous tunnels are explicitly forbidden.

- [x] B10: Diff checks, immutable commit/tree identity, and rollback evidence are recorded without claiming QA, Audit, Cherry acceptance, or external completion.
  CHECK: git diff --check
  EXPECT: exit 0
  EVIDENCE: `git diff --check` PASS; rollback command is in `docs/REMOTE_ACCESS.md`; exact candidate commit/tree is measured immediately after the local commit and reported in the terminal handoff. QA, Audit, Cherry acceptance, and external completion remain open.
