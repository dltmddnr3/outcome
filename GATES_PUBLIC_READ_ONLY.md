# OUTCOME public read-only follow-up gates

Outcome: Cherry can reach the Mac Mini collector through an explicitly enabled temporary public HTTPS URL without exposing mutation controls or private source evidence.

- [x] P1: Authentication remains the default and public access requires `OUTCOME_PUBLIC_READ_ONLY=1`.
  CHECK: npm run test:runtime
  EXPECT: exit 0
  EVIDENCE: runtime tests PASS 10/10 including auth-default 401/cookie flow and explicit public-mode branch.

- [x] P2: Public mode serves the dashboard bundle and sanitized GET API without login.
  CHECK: npm run test:public
  EXPECT: exit 0
  EVIDENCE: public-mode tests PASS 3/3; live public dashboard GET 200.

- [x] P3: Public and authenticated modes return 405 `read_only` for dashboard mutation routes.
  CHECK: npm run test:security
  EXPECT: exit 0
  EVIDENCE: security tests PASS 10/10; live public POST returned 405 `read_only`.

- [x] P4: Public HTML, bundle, and serialized dashboard payload contain no prohibited paths, secrets, cookies, raw session/thread data, unnecessary full hashes, or sensitive identifiers.
  CHECK: npm run test:redaction
  EXPECT: exit 0
  EVIDENCE: recursive sanitizer unit test and live payload/HTML/bundle pattern scan PASS.

- [x] P5: Frontend, Node, production build, desktop/mobile geometry, scope, runbook, and diff checks pass.
  CHECK: npm test && npm run build && npm run test:browser && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: exit 0
  EVIDENCE: frontend 2/2 and Node 17/17 PASS; build 1581 modules; local and public 1440x900/390x844 geometry PASS; scope/runbook/diff PASS.

- [x] P6: A Cloudflare Quick Tunnel process exposes the actual local server and the public URL passes live GET, mutation, and redaction probes.
  CHECK: test -s .outcome-runtime/public-url && curl -fsS "$(cat .outcome-runtime/public-url)/api/health" | rg -q 'public_read_only'
  EXPECT: exit 0
  EVIDENCE: `https://prizes-subaru-participation-ram.trycloudflare.com`; origin PID 60045, cloudflared PID 60046, unified session 58594; live GET/POST/redaction PASS.

- [x] P7: Quick Tunnel randomness, restart behavior, no SLA, process/PID lifecycle, restart command, and later stable-hosting Gate are documented.
  CHECK: npm run check:runbook
  EXPECT: exit 0
  EVIDENCE: `docs/REMOTE_ACCESS.md` and `docs/STAGE3_PUBLIC_DEPLOYMENT.md`; runbook check PASS.

- [x] P8: The bounded follow-up has an exact local commit/tree/parent and no push, paid purchase, domain change, Cherry Note iOS, or WhiteCastle Desk mutation.
  CHECK: git diff --check
  EXPECT: exit 0
  EVIDENCE: diff check PASS; exact commit/tree/parent measured after local commit and reported in terminal. No push, paid purchase, domain change, Cherry Note iOS, or WhiteCastle Desk mutation performed.
