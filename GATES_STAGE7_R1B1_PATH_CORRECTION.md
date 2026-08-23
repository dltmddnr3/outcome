# Stage 7 R1B-1 local path correction gates

Base candidate: `79d20d84ec4a3aff40d95066b01f7663b28c8f53`
Authority: Cherry-approved Builder correction; Stage 7 and Stage 8 remain open
Planner false_completion_count: `12`

- [x] P1: Public Package projection removes only `gate.gates[*].evidence`; Stage axes and other evidence-state fields remain intact.
  CHECK: node --test --test-name-pattern='public projection removes raw Gate evidence' server/outcome-package.test.mjs
  EXPECT: exit 0
  EVIDENCE: red-first failure on the prior projection, then targeted PASS 1/1.
- [x] P2: Sanitizer redacts absolute local POSIX roots including tmp/private-tmp/var/opt/etc/Volumes/Library while preserving URLs, API routes and asset routes.
  CHECK: node --test --test-name-pattern='absolute POSIX paths' server/cherry-note-dashboard.test.mjs
  EXPECT: exit 0
  EVIDENCE: red-first `/tmp` fixture failed before implementation, then targeted PASS 1/1 across tmp/private-tmp/private-var/var/opt/etc/Volumes/Library/Applications/usr-local; URL/API/asset controls remained unchanged.
- [x] P3: Public API regression exposes zero raw Gate evidence/local paths while preserving `axes.evidence` semantics.
  CHECK: node --test --test-name-pattern='raw Gate path evidence' server/index.test.mjs
  EXPECT: exit 0
  EVIDENCE: red-first public API fixture retained raw Gate evidence before implementation, then targeted PASS 1/1.
- [x] P4: Local/public API, HTML, bundle and rendered UI scan zero UUID/session/task/thread/turn/local absolute path/full hash/credentials; mutation matrix remains 24/24 per surface.
  CHECK: npm run build && npm run check:public-boundary && npm run test:security
  EXPECT: exit 0
  EVIDENCE: after Planner activated exact candidate 5d8d751 while preserving tunnel PID 76819, `docs/STAGE7_PATH_CORRECTION_FRESH_UX_QA_5d8d751.md` independently measured zero prohibited hits across local/public API, HTML, bundle, rendered UI and 68 Stage visits; both mutation matrices passed 24/24.
- [x] P5: Full frontend/Node, runtime identity/status, scope/runbook/build and 17-Stage desktop/mobile browser regressions pass without restarting live origin/tunnel.
  CHECK: npm test && npm run check:scope && npm run check:runbook && npm run test:browser && git diff --check
  EXPECT: exit 0
  EVIDENCE: frontend 16/16; Node 61/61; production build PASS; scope/runbook PASS; local and remote desktop/mobile each exercised all 17 selected Stages with clipped/intersections/viewportEscape=0. Fresh affected QA verified activated origin PID 98804 and tunnel PID 76819 identities PASS.
- [x] P6: One Builder candidate preserves the immutable QA artifact, is pushed to origin/main, reports exact pin/status, and does not claim Stage 7/8 PASS.
  CHECK: test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
  EXPECT: exit 0
  EVIDENCE: Builder commit 5d8d751 matched origin/main and the public receipt; prior immutable QA artifact SHA-256 remains `5376d1fc92be02e928fa368914a89741b7ded92338ebc57ce7a15d3eab398d26`. Fresh path-correction QA artifact SHA-256 is `e1ca8ef0e1906ec564c4d41c877ff5860afa77a3808cdeb5c217fa6b4fa77f63`. Stage 7/8 remain open.
