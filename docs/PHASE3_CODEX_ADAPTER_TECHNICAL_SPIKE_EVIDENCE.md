# OUTCOME Phase 3 · Codex Adapter Technical Spike Evidence

State: `SYNTHETIC_NO_OP_COMPLETE · PRODUCTION_RELAY_NO_GO · MANUAL_FALLBACK_ONLY`

Observed: `2026-08-26 KST`

## Authority and boundary

- authorization commit: `2ea237c7806c71c1d8179d7371c8d85a5d426eb4`
- authorization tree: `acff3fecbbca4ec9c2d1efd5abc756729f9ee76b`
- Builder brief SHA-256: `18eff6d63780ba85336bda2f8760e803aec5c7de24ba156f54c7fe9550b95264`
- execution mode: synthetic/no-op only
- app-server processes started: `0`
- real session enumerations, reads, resumes and sends: `0`
- private database, UI, hidden endpoint and credential accesses: `0`
- actual high-risk executions: `0`
- external mutations, pushes and deployments: `0`

This evidence closes the bounded diligence experiment only. It does not implement or authorize a registry, relay, router, real session observation, real instruction delivery, QA, Audit, Cherry acceptance, release or Phase 3 completion.

## Primary sources and local pins

| Source | Pin and observed fact |
| --- | --- |
| `https://developers.openai.com/codex/app-server` | Observed 2026-08-26 KST. App Server is the documented deep-integration protocol; `stdio` is JSONL; initialize/initialized is mandatory; `thread/read` reads without resuming; `turn/start` targets a thread; `turn/completed` carries terminal status. The app-server command and WebSocket transport are experimental and unsupported for production workloads. |
| `https://developers.openai.com/codex/cli/reference` | Observed 2026-08-26 KST. `codex app-server` and schema generators are exposed as experimental developer commands. |
| `https://developers.openai.com/codex/sdk` | Observed 2026-08-26 KST. SDK resume/run is intended for programmatic jobs, but a run performs real model work and was not invoked. |
| `https://developers.openai.com/codex/pricing` | Observed 2026-08-26 KST. General Codex plan and API usage information is published; no app-server-call-specific incremental price was pinned. |
| installed CLI | `codex-cli 0.149.0-alpha.4` |
| generated aggregate schema | SHA-256 `02a4c63a638fdae4a5f6c3ad32a41a377b642c66f3abc84f6fc47c7f3d6074df` |
| generated v2 aggregate schema | SHA-256 `9b3de71a5a2ffc980b792a18aa8f8dec3f85f48829560222a0264fe494b679a9` |

The locally generated schema contains `thread/list`, `thread/read`, `thread/resume`, `turn/start`, `turn/steer` and `turn/completed`. `TurnSteerParams` requires `threadId`, `expectedTurnId` and `input`.

## Capability matrix

| Capability | Status | Evidence or boundary |
| --- | --- | --- |
| exact stored-thread read | supported | official `thread/read`; no real thread invoked |
| thread enumeration | supported | official `thread/list`, but forbidden until explicit private binding |
| exact thread resume | supported | official `thread/resume`; no real thread invoked |
| exact turn start | supported | official `turn/start(threadId, input)`; synthetic envelope only |
| accepted acknowledgement | supported | JSON-RPC response and `turn/started` mean accepted/in progress, not complete |
| terminal acknowledgement | supported | `turn/completed` reports completed, interrupted or failed |
| authentication surface | supported | documented App Server account/initialization surface; no credential accessed |
| native OUTCOME project + role binding | unsupported | not represented by the provider protocol; requires a separately approved private registry |
| provider duplicate idempotency | unknown | no documented exactly-once/idempotency guarantee pinned |
| timeout retry semantics | unknown | no documented safe automatic retry guarantee pinned |
| product-specific rate limit | unknown | no App Server-specific limit pinned |
| incremental App Server cost | unknown | no per-call price pinned |
| unattended Mac mini permission | unknown | no explicit unattended-host permission pinned |
| integration terms / enterprise client registration | unknown | official docs request known-client registration for enterprise integrations; applicability is unresolved |
| credential rotation and revocation design | unknown | no secret was used; production least-privilege lifecycle remains unproven |
| production WebSocket transport | unsupported | explicitly experimental and unsupported for production workloads |

## Synthetic adapter proof

The spike implements a pure in-memory adapter under `spikes/codex-adapter/`. It never spawns App Server and cannot transmit an envelope.

- exact project + role + private binding is required before a synthetic observation or instruction can proceed
- wrong project, wrong role, unbound and conflict states fail closed
- `turn/start` target and instruction mapping is constructed with `transmitted=false`
- accepted and terminal acknowledgements remain distinct
- timeout becomes `delivery_unknown` with `retryAllowed=false`
- duplicate idempotency keys are locally deduplicated and do not add an attempt
- high-risk work without exact confirmation is denied
- activity or protocol acceptance never becomes completion
- public projection removes identifier keys, paths, credentials, prompt/result and full hashes

## Measured commands

```text
node --test spikes/codex-adapter/codex-adapter.test.mjs
13 tests; 13 pass; 0 fail

node spikes/codex-adapter/check-public-output.mjs
prohibited_hits=0
high_risk_execution_count=0
decision=NO_GO
fallback=UNBOUND_MANUAL_NAVIGATION

npm test
frontend 79/79; Node 112/112

npm run test:security
29/29; stable snapshot prohibited disclosures=0; client environment leaks=0

npm run build:isolated
1652 modules; asset index-B1toTjEC.js

OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary
API/HTML/bundle/rendered UI prohibited identifiers=0

npm run check:mutations
32/32 mutation paths returned 405

npm run check:scope
PASS

npm run check:runbook
PASS

git diff --check
PASS
```

The first synthetic test run produced one deliberate red boundary failure: the scanner treated safe prose containing the word `token` as a leaked credential. The scanner was narrowed to serialized sensitive keys or credential-shaped values, after which all 13 tests and the explicit public-output scan passed.

## Decision

`NO_GO` for production Codex observation/relay.

The provider exposes relevant protocol primitives, but native OUTCOME binding is absent and idempotency, timeout retry, product-specific limits, incremental cost, unattended-host permission, integration terms and credential lifecycle remain unresolved. The brief requires fail-closed behavior when any of these remain unclear.

Smallest supported fallback: `UNBOUND_MANUAL_NAVIGATION`. Keep the dashboard read-only/unbound and let Cherry navigate manually. Do not enable automated observation or delivery. A later separately authorized registry slice may use these protocol pins, but it must not activate relay until the unknowns above are resolved.

## Rollback and residual unknowns

Before the local candidate is committed, rollback is limited to the five task-owned paths listed below; unrelated files must remain untouched. After commit, revert only the exact candidate commit supplied in the terminal receipt.

Task-owned paths:

- `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md`
- `docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_EVIDENCE.md`
- `spikes/codex-adapter/codex-adapter.mjs`
- `spikes/codex-adapter/codex-adapter.test.mjs`
- `spikes/codex-adapter/check-public-output.mjs`

Residual unknowns are the seven `unknown` entries in the capability matrix. No claim is made that synthetic acceptance is a real provider receipt.
