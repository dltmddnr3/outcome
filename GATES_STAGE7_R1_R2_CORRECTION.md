# Stage 7 R1/R2 corrective gates

Base candidate: `a0743fb35b9c617715dd70bb7bf09dc7cd89a2d9`
Authority: Cherry-approved Builder correction; Stage 7 and Stage 8 remain open

- [x] R1A: Evidence sanitizer redacts hyphenated UUIDs and delimiter-less task/turn/thread/session identifiers before Package projection.
  CHECK: node --test --test-name-pattern='UUID|delimiter-less' server/cherry-note-dashboard.test.mjs
  EXPECT: exit 0
  EVIDENCE: red-first sanitizer regression failed on raw UUID, then PASS after delimiter and UUID rules were added.
- [x] R1B: Public generic API serialization exposes zero local paths, credentials, task/turn/thread/session identifiers, UUIDs, or full hashes from Gate evidence.
  CHECK: node --test --test-name-pattern='raw Gate evidence identifiers' server/index.test.mjs
  EXPECT: exit 0
  EVIDENCE: red-first public API regression failed on both audit UUIDs, then PASS; local and live public API/HTML/bundle scan measured prohibited identifiers=0.
- [x] R2A: Origin writes its actual PID atomically after listen and removes the PID file only when it still owns that record.
  CHECK: node --test --test-name-pattern='PID record' server/runtime-process.test.mjs
  EXPECT: exit 0
  EVIDENCE: atomic-record ownership test PASS; isolated origin writes its actual PID after listen and removes it on validated SIGTERM, while a replaced record is preserved.
- [x] R2B: Runtime status/stop validates live PID, command identity and origin port/tunnel URL relation; stale or mismatched PID fails closed and stop terminates only the validated isolated target.
  CHECK: node --test server/runtime-process.test.mjs
  EXPECT: exit 0
  EVIDENCE: 4/4 runtime tests PASS. Wrong-port and unrelated-process records reject with identity_mismatch without signaling; validated isolated target alone stops. Live tunnel PID 76819 validates exact cloudflared command and loopback URL without restart.
- [x] R2C: Runbook uses validated runtime commands, contains no hardcoded historical PID/session instructions, and preserves Quick Tunnel/stable-hosting debt boundaries.
  CHECK: npm run check:runbook
  EXPECT: exit 0
  EVIDENCE: runbook checker PASS; historical PID/session commands removed; atomic dist, stable hosting/supervisor, configurable roots and cookie hardening remain explicit follow-ups.
- [x] V1: Full frontend/Node/security, scope/runbook, build and local all-state browser checks pass without restarting the live origin or tunnel.
  CHECK: npm test && npm run test:security && npm run check:scope && npm run check:runbook && npm run build && npm run test:browser && git diff --check
  EXPECT: exit 0
  EVIDENCE: frontend 16/16, Node 58/58, security 15/15, build, public-boundary, scope 16 files, runbook and both local browser viewports PASS. Live origin/tunnel were not restarted.
- [x] V2: One Builder candidate includes the Planner Gate correction and immutable audit artifact, is pushed to origin/main, and reports false_completion_count=11 without Stage 7/8 PASS.
  CHECK: test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
  EXPECT: exit 0
  EVIDENCE: final terminal check records exact HEAD=origin/main; immutable commit identity is reported outside this self-referential ledger. Stage 7/8 remain open.
