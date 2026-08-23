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
- [ ] P4: Local/public API, HTML, bundle and rendered UI scan zero UUID/session/task/thread/turn/local absolute path/full hash/credentials; mutation matrix remains 24/24 per surface.
  CHECK: npm run build && npm run check:public-boundary && npm run test:security
  EXPECT: exit 0
  EVIDENCE: local API/HTML/bundle/rendered UI scan PASS with zero prohibited hits; security 16/16; local and public mutation matrices each 24/24. Live public API scan still correctly FAILS `public:api:localPath` because the no-restart origin PID 69313 retains the prior server module. Public HTML/bundle/rendered UI produced no other hit. P4 remains open until an authorized exact-candidate origin activation.
- [x] P5: Full frontend/Node, runtime identity/status, scope/runbook/build and 17-Stage desktop/mobile browser regressions pass without restarting live origin/tunnel.
  CHECK: npm test && npm run check:scope && npm run check:runbook && npm run test:browser && git diff --check
  EXPECT: exit 0
  EVIDENCE: frontend 16/16; Node 61/61; production build PASS; scope/runbook PASS; local and remote desktop/mobile each exercised all 17 selected Stages with clipped/intersections/viewportEscape=0; origin PID 69313 and tunnel PID 76819 identities PASS without restart.
- [x] P6: One Builder candidate preserves the immutable QA artifact, is pushed to origin/main, reports exact pin/status, and does not claim Stage 7/8 PASS.
  CHECK: test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
  EXPECT: exit 0
  EVIDENCE: final terminal verifies the single Builder commit against origin/main and reports its exact receipt; immutable QA artifact SHA-256 remains `5376d1fc92be02e928fa368914a89741b7ded92338ebc57ce7a15d3eab398d26`. Stage 7/8 remain open.
