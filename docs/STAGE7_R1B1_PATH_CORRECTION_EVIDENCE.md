# Stage 7 R1B-1 absolute path correction evidence

Observed: 2026-08-24 KST

Base: `79d20d84ec4a3aff40d95066b01f7663b28c8f53`

Authority boundary: Builder correction only. Stage 7 Release Audit, Stage 8 Cherry acceptance, deployment activation, and release remain separate. Planner cumulative `false_completion_count=12` is preserved.

## Correction

- The public Package projection removes `gate.gates[*].evidence`, which the dashboard UI does not consume. Stage `axes.evidence` and all other Package semantics remain present.
- Defense-in-depth sanitation and scanning cover absolute POSIX roots under `/tmp`, `/private/tmp`, `/var`, `/private/var`, `/opt`, `/etc`, `/Volumes`, `/Library`, `/Applications`, `/System`, `/usr`, `/bin`, `/sbin`, and `/dev`, plus Windows drive paths.
- URL paths, `/api/dashboard`, and `/assets/...` are explicit negative controls and are not treated as local filesystem paths.
- The public-boundary check now scans API, HTML, bundle, and rendered UI locally and, when `OUTCOME_PUBLIC_URL` is supplied, on the live public endpoint.
- The read-only mutation matrix covers six routes by four methods: 24 local and 24 public requests, all requiring `405 {"error":"read_only"}`.

## Red-first and verification evidence

- Prior behavior failed three new targeted regressions: raw Gate evidence remained projected, `/tmp` was not sanitized, and the public API retained raw Gate path evidence.
- Corrected targeted tests: 3/3 PASS.
- Frontend: 16/16 PASS. Node: 61/61 PASS. Security subset: 16/16 PASS.
- Production build: PASS, asset `index-BKvB8IOW.js`.
- Scope and runbook: PASS.
- Local browser: 17 selected Stages at 1440x900 and 390x844; clipped=0, intersections=0, viewportEscape=0.
- Remote browser: the same 17 selected Stages and both viewports; clipped=0, intersections=0, viewportEscape=0.
- Mutation matrix: local 24/24 and public 24/24 returned 405/read_only.
- Runtime identity remained healthy without restart: origin PID 69313 listens on 8791; Quick Tunnel PID 76819 retains the expected command and loopback relation.

## Honest activation result

The corrected local candidate returns zero prohibited hits across API, HTML, bundle, and rendered UI. The live public origin was explicitly not restarted. Its process therefore retains the previous server module: the enhanced live scan correctly reports `public:api:localPath`, while public HTML, bundle, and rendered UI report no other category. This is not a product-code ambiguity and is not counted as a PASS.

Exact activation blocker: an authorized operator must restart origin PID 69313 from the exact corrected commit while preserving tunnel PID 76819, then rerun the public boundary scan. This Builder slice does not perform that prohibited restart.

Stage 7 and Stage 8 remain open. Fresh affected QA and fresh Release Audit are still required after exact-candidate activation.
