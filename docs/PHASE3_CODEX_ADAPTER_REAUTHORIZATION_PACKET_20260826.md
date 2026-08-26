# OUTCOME Phase 3 · Codex Adapter 재승인 패킷 · 2026-08-26

State: `PREPARED_NOT_DISPATCHED · SYNTHETIC_ONLY · S1-S6_OPEN`

## Purpose

이 패킷은 이전 Builder 실행의 `SAFE_HOLD_SOURCE_DRIFT` 이후 현재 소스를 다시 고정한다. 기능 구현, capability GO, 실제 세션 binding, Phase 3 진행 또는 완료 증거가 아니다.

## Exact source pins

- source baseline commit: `ea4a4e542142ac9c5ee27372a47ffef3b51957fd`
- source baseline tree: `b48c64971587234265571e241ed0047eb2614aee`
- immutable product baseline ancestor: `7f8f1f08f5f552b919cf8b5f7486b5fbf286ba9e`
- Builder brief: `docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md`
- Builder brief SHA-256: `18eff6d63780ba85336bda2f8760e803aec5c7de24ba156f54c7fe9550b95264`
- execution Gate: `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6`

The immutable authorization candidate commit/tree is measured after this packet is committed and supplied separately at dispatch. The brief must retain the exact SHA-256 above. Any later repository mutation requires a new source pin and reauthorization.

## Primary source and local inventory

- official source: `https://developers.openai.com/codex/app-server` (observed 2026-08-26 KST; redirects to the current ChatGPT Learn App Server documentation)
- installed CLI: `codex-cli 0.149.0-alpha.4`
- local inspection: `codex app-server --help`
- version-specific schema command: `codex app-server generate-json-schema --out <os-temporary-directory>`
- generated aggregate schema SHA-256: `02a4c63a638fdae4a5f6c3ad32a41a377b642c66f3abc84f6fc47c7f3d6074df`
- generated v2 aggregate schema SHA-256: `9b3de71a5a2ffc980b792a18aa8f8dec3f85f48829560222a0264fe494b679a9`

## Confirmed surface

- App Server is documented as the deep-integration interface for authentication, conversation history, approvals and streamed agent events.
- The default `stdio` transport is newline-delimited JSON. WebSocket transport is documented as experimental and unsupported for production workloads.
- A client must complete `initialize` followed by `initialized` before other requests.
- Official documentation and the locally generated schema expose `thread/list`, `thread/read`, `thread/resume`, `turn/start`, `turn/steer` and the `turn/completed` notification.
- Local `turn/steer` schema requires `threadId`, `expectedTurnId` and `input`; this supplies an active-turn precondition but does not by itself prove OUTCOME acknowledgement or idempotency semantics.

## Residual unknowns

- no native OUTCOME project + role binding has been established
- exact acknowledgement meaning across accepted, streamed, completed, failed and interrupted states remains unproven
- duplicate delivery and idempotency behavior remains unproven
- timeout and retry policy remains unproven
- product-specific rate limits, incremental cost, terms and Mac mini unattended-operation allowance remain unpinned
- safe least-privilege credential and revocation design remains unproven
- production transport choice remains open; experimental WebSocket is not a production assumption

These unknowns keep S1-S6 open and require the Builder's synthetic/no-op harness and evidence receipt.

## Zero-mutation receipt

- app-server process started: `0`
- real session enumeration: `0`
- real thread read/resume: `0`
- real message/turn dispatch: `0`
- private Codex database or UI inspection: `0`
- credentials read or copied: `0`
- product code changes: `0`
- external mutations: `0`
- push/deploy/release: `0`

## Builder handoff condition

Dispatch only when the private OUTCOME Builder target is explicitly rebound outside Git and the immutable authorization commit/tree containing this exact packet and unchanged brief SHA is supplied. Builder must follow the Allowed, Forbidden, Required checks, Required receipt and SAFE_HOLD sections of the brief without expansion.

## Current decision

`REAUTHORIZATION_CANDIDATE_READY_ONLY`

This is neither `GO` nor `NO-GO`. The smallest current product fallback remains no active relay: retain manual navigation or unbound/read-only presentation until supported synthetic evidence establishes stronger semantics.
