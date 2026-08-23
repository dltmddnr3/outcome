# Stage 7 R1/R2 correction evidence

Observed: 2026-08-24 KST
Authority: Cherry-approved OUTCOME-only Builder correction
Base candidate: `a0743fb35b9c617715dd70bb7bf09dc7cd89a2d9`
Audit source: `docs/STAGE7_FRESH_RELEASE_AUDIT_b57edd7.md` (`FAIL`)
Planner `false_completion_count`: `11`

## R1 public privacy correction

- `sanitizeEvidenceText` removes delimiter-form identifiers, delimiter-less task/turn/thread/session high-entropy identifiers, and standalone hyphenated UUIDs.
- Red-first sanitizer and generic public API tests failed on the prior behavior and pass after correction.
- Planner's intended Gate evidence correction removes two raw session UUIDs from the publicly parsed source while preserving the immutable audit artifact unchanged.
- The built candidate's local API, HTML and bundle scan reports zero local paths, raw role identifiers, UUIDs, full hashes, credential URLs/tokens, or private keys. The live public route independently returns GET 200, mutation 405, and the same three-surface zero-hit result.

## R2 runtime bookkeeping correction

- The origin writes `.outcome-runtime/server.pid` atomically only after listen succeeds. Exit cleanup deletes only a record that still equals its own `process.pid`.
- Runtime status/register/stop reads a numeric PID, requires a live process, validates the actual command, and requires the origin listener port or tunnel loopback URL relation before acting.
- Isolated tests prove a stale/wrong-command record and a wrong-port request fail closed without signaling the unrelated/live target. A correctly recorded isolated origin alone receives SIGTERM and removes its owned PID record.
- The live tunnel remained PID 76819 at the same public URL. Its command identity and `--url http://127.0.0.1:8791` relation were validated before the stale tunnel record was replaced. It was never stopped or restarted.
- The live origin was not restarted. Its old PID record reports `stale_pid_record`; Planner owns the short corrected-candidate restart/cleanup probe.

## Verification

- Frontend: 16/16 PASS.
- Node: 58/58 PASS, including 4/4 runtime-process tests.
- Security subset: 15/15 PASS.
- Production build, public-boundary scan, scope (16 product/runtime/test files), runbook and `git diff --check`: PASS.
- Local Chrome 1440x900 and 390x844: each traversed 2 projects x 17 selected Stage states with clipping/intersection/viewport escape 0, controls >=44px, text >=11px and 4.5:1, focus >=14.83:1.

## Deferred Stage 7 debt

Atomic isolated `dist` swap, stable hostname/supervisor, configurable validated Package roots, and authenticated-cookie hardening remain explicit Release Audit follow-ups. This slice does not close A1-A4, Stage 7, Stage 8, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, or `EXTERNAL_OUTCOME_COMPLETE`.
