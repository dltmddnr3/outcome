# OUTCOME Stage 7 Fresh Release Audit · b57edd7

- Verdict: `FAIL`
- Audit state: complete; no probe was blocked
- Fresh Claude session: `9f4a0176-9cad-4506-a25a-45f3e910564a`
- Model / effort: `claude-opus-5` / high
- Candidate commit: `b57edd7b4f838b860151d9b577713ee41f37090f`
- Candidate tree: `dc4d300f0d0b1778a4b7b75ac4c90f544ac57d3b`
- Candidate parent: `7741e68e972ff2ce7dfb972c64e1a0d4cc5b29f4`
- Implementation candidate: `93b0497d3881b7672a8e3427562e0e6cd89e5bfb`
- Public URL: `https://van-staff-excellence-investigated.trycloudflare.com/cherry-note-dashboard`
- `false_completion_count`: `10` preserved; no unilateral increment

This was a separate fresh Release Audit. It did not reuse Stage 6 session `e38a17e5-7c5c-4a13-b3cf-ce8557dea226` or any earlier QA session. The auditor received read-only `Read` and command capability only. There were zero permission denials. No product edit, commit, push, deploy, release, public-route change, self-acceptance, Cherry acceptance, or external completion transition occurred. The untracked user file `docs/ROADMAP 2.md` was not opened or modified.

## A1–A4 disposition

| Gate | Verdict | Independent evidence |
| --- | --- | --- |
| A1 | `PASS` | `HEAD=origin/main=b57edd7b4f838b860151d9b577713ee41f37090f`; exact tree and parent match the candidate receipt. A separate fresh Release Audit ran after Stage 6 QA. |
| A2 | `FAIL` | Standalone startup, source isolation, reproducible build, local/public regression, artifact rollback, and current served-byte parity passed. Public privacy failed because `/api/dashboard` exposes the Stage 6 Claude session UUID. The documented PID-based public teardown also targets dead PIDs and cannot stop the current route. |
| A3 | `PASS` | This report pins commit, tree, parent, artifacts, tested paths, fresh session, regression results, blockers, rollback evidence, and `false_completion_count=10`. |
| A4 | `PASS` | Audit PASS was not claimed. Stage 8, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, and `EXTERNAL_OUTCOME_COMPLETE` remain open and separate. |

Overall `FAIL` follows from A2. This is not `BLOCKED`: every required probe executed.

## Candidate identity and wrapper diff

Direct Git verification:

```text
HEAD        b57edd7b4f838b860151d9b577713ee41f37090f
origin/main b57edd7b4f838b860151d9b577713ee41f37090f
tree        dc4d300f0d0b1778a4b7b75ac4c90f544ac57d3b
parent      7741e68e972ff2ce7dfb972c64e1a0d4cc5b29f4
origin      git@github.com:dltmddnr3/outcome.git
```

`93b0497..b57edd7` changes only four Markdown files:

```text
M GATES_OUTCOME_MVP.md
M docs/CURRENT_STATE.md
M docs/OUTCOME_MAP.md
A docs/STAGE6_FRESH_UX_PRODUCT_QA_93b0497.md
```

All code, package, template, build configuration, and test blobs are byte-identical. The two post-implementation commits are therefore build-input-neutral QA evidence / map wrappers. They are not product-output-neutral: OUTCOME parses Gate and map Markdown into the public dashboard payload. The wrapper introduced the raw session UUID described below after the Stage 6 candidate was audited.

## Reproducible build and artifact identity

The fresh auditor created a detached exact-commit worktree under a unique temporary directory, ran isolated `npm ci`, and performed two clean production builds. Both builds were byte-identical. The temporary worktree, dependency cache, servers, and artifacts were then removed.

| Artifact | SHA-256 | Build 1 | Build 2 | Current local `dist` | Public served bytes |
| --- | --- | --- | --- | --- | --- |
| `index.html` | `1d53573e43759f4ff9cf03592961e83a4e00755d00a46deeb4f45fb05f05dde5` | match | match | match | match |
| `assets/index-BKvB8IOW.js` | `d2afc60c4e2d212ed6b65d18390d436feca19878ad752cb69cecc5422125a664` | match | match | match | match |
| `assets/index-DxNb1je7.css` | `073dd29f0827b89e13baeb89333e6adcf41dc7d435901e20faa90d0d11fa069a` | match | match | match | match |

Toolchain observed in the isolated run: Node `v24.13.1`, npm `11.8.0`, Vite `7.3.6`. The public receipt `b57edd7b4f83 / dc4d300f0d0b / index-BKvB8IOW.js` matches independently fetched bytes at audit time.

## Full regression matrix

| Probe | Result |
| --- | --- |
| Frontend `vitest run` | `16/16 PASS` |
| Node `node --test server/*.test.mjs` | `52/52 PASS` |
| `npm run check:scope` | PASS across 14 scoped product/runtime/test files; no Desk, Slack, relay, or provider dependency |
| `npm run check:runbook` | PASS |
| Local browser | desktop 1440×900 and mobile 390×844 PASS across both projects and all 17 selected Stages |
| Remote browser | desktop 1440×900 and mobile 390×844 PASS across both projects and all 17 selected Stages |
| Browser geometry/accessibility | clipped 0, intersections 0, viewport escape 0, controls at least 44 px, text at least 11 px and 4.5:1, focus contrast 14.83 |
| Public route | dashboard GET 200; CSP, `nosniff`, frame denial, no-referrer, permissions policy, noindex, and `cache-control: no-store` present |
| Mutation denial | local and public `24/24` returned `405 {"error":"read_only"}` |

The mutation matrix used six routes — `/api/dashboard`, `/api/dashboard/cherry-note`, `/api/auth/login`, `/api/auth/logout`, `/api/unknown`, and `/cherry-note-dashboard` — with POST, PUT, PATCH, and DELETE.

Auth-default startup fails closed without required credentials. Unauthenticated auth-mode dashboard APIs return 401 without data; the unauthenticated page serves only the login shell and not the dashboard bundle. Valid sessions use HttpOnly and SameSite=Strict cookies. `Secure` is conditional on `NODE_ENV=production`, which is noted as operational hardening debt below. Path-traversal probes disclosed no repository, environment, or runtime file.

## Release blockers

### R1 · Public session UUID leakage

Unauthenticated `GET /api/dashboard` currently exposes this raw UUID once:

```text
e38a17e5-7c5c-4a13-b3cf-ce8557dea226
```

It appears in parsed A1 evidence sourced from `GATES_OUTCOME_MVP.md`. The current sanitizer catches delimiter-based session values and long contiguous hex strings, but does not catch a delimiter-less `session <UUID>` form or a hyphenated UUID. This violates the closed public-redaction boundary W3 and A2 privacy. Because the leak was introduced by parsed Markdown after the implementation candidate's Stage 6 QA, build-byte parity does not clear it.

Classification: **release-blocking**.

### R2 · Documented rollback teardown targets dead PIDs

Read-only runtime inspection found:

| Process | Recorded PID | Actual live PID |
| --- | ---: | ---: |
| Origin on `127.0.0.1:8791` | `5278` | `44161` |
| Quick Tunnel | `60046` | `76819` |

The documented `kill` command reads the two stale PID files, so it would leave the present public route active. Artifact rollback itself is reproducible; the public-route teardown part of rollback is not operationally valid.

Classification: **release-blocking for A2 rollback**.

## Rollback evidence without deployment

The auditor built prior immutable candidates only in temporary detached worktrees and did not switch the public route:

- `93b0497`: build PASS; artifacts byte-identical to `b57edd7`, proving the post-QA commits did not alter build inputs.
- `aa90faf`: build PASS; distinct prior asset `index-DLRYzMVQ.js`, proving a materially different immutable artifact can be reproduced.
- `package.json` and `package-lock.json` are identical across these candidates, so artifact rollback requires no dependency change.

Artifact rollback is `PASS`; current documented public teardown is `FAIL` under R2.

## Operational build/runtime parity and debt classification

| Risk | Classification | Evidence and contract reason |
| --- | --- | --- |
| `npm run build` writes directly into ignored live `dist/` | Non-blocking operational debt for this exact candidate | It creates a real non-atomic window, but both isolated builds, current local `dist`, and public bytes are now byte-identical. Local MVP has no availability SLA. Require isolated build plus atomic swap before stable hosting. |
| Startup-captured receipt can drift from served assets | Non-blocking operational debt for this exact candidate | Receipt is captured once. Replacing `dist` under the running process can leave the old receipt while new assets are served. Exact audit-time hashes independently establish current parity, but the receipt is not self-verifying. |
| Quick Tunnel random hostname / no SLA / no supervisor | Non-blocking operational debt | W6 and `docs/REMOTE_ACCESS.md` explicitly scope the current URL as temporary public feedback and defer stable hosting. This does not excuse the broken PID teardown in R2. |
| Hardcoded Package roots | Non-blocking Local MVP portability debt | A detached server still reads the Mac Mini's absolute Cherry Note and OUTCOME roots. Standalone build/startup passes, but runtime data-root portability does not. Add configurable validated roots before multi-PC/runtime expansion. |
| Conditional `Secure` cookie | Non-blocking current public-mode debt | The live public mode creates no auth cookie. Authenticated production operation must set `NODE_ENV=production` or make secure-cookie policy explicit. |
| Stale scope evidence count | Documentation debt | M1 evidence says 10 scoped files while current scope check measures 14. |

## Minimal corrective slice

1. Redact hyphenated UUIDs and delimiter-less session identifiers in `sanitizeEvidenceText`; add a regression proving raw UUIDs in Gate evidence cannot reach remote payloads.
2. Remove the raw QA session UUID from the publicly parsed Gate evidence. Fix both source content and sanitizer control.
3. Repair runtime PID bookkeeping and rollback instructions, then verify teardown by proving port 8791 closes and the public URL stops responding. Do not perform this public switch without separate authorization.
4. Produce a corrected immutable candidate and run fresh affected UX/Product QA over its parsed served payload, not only its build assets.
5. Run a new separate Release Audit on that corrected candidate. Route atomic build/swap, lazy or asserted receipt parity, stable hostname/supervision, Package-root configuration, and cookie hardening to the smallest appropriate operational follow-up.

Whether R1 increments `false_completion_count` from 10 to 11 is reserved for the owning coordinator/QA contract. This audit preserves the instructed value `10` and does not silently rewrite history.

## Residual unknowns and terminal boundary

- Runtime data-root isolation cannot be proven while Package roots remain hardcoded; isolated servers necessarily read the live Mac Mini Package sources.
- OPTIONS, TRACE, post-reboot cold start, concurrent load, Cloudflare retention, and third-party dependency CVE audit were not part of A1–A4.
- Cloudflare edge retention of the exposed UUID is not observable; treat the value as disclosed.

No Stage 7 Gate checkbox was changed by this independent auditor. Stage 8 C1/C2, Cherry physical acceptance, release approval, `MVP_SCOPE_CLOSED`, and `EXTERNAL_OUTCOME_COMPLETE` remain open.
