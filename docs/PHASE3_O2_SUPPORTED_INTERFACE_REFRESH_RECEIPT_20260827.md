# OUTCOME Phase 3 · O2 Supported Interface Refresh Receipt

Status: **PARTIAL_NOT_PROVEN · READ-ONLY OFFICIAL-DOCS DILIGENCE · O2 OPEN/LOCKED**

Observed: 2026-08-27 KST

## Exact source and research boundary

- OUTCOME source head: `ebd4b32fd9dfd7554ecdc599ca62928f653cb247`
- OUTCOME source tree: `fc4afbce8c2e65aafb082b5d00599d51cdaa0769`
- OUTCOME source parent: `4bc4d4c08fe1a00cf9d24ae05db96b49c1286e89`
- official OpenAI Codex repository observation pin: `a57b398351a803c9ec94e38042bc82f527bed2a4`
- prior diligence: `docs/PHASE3_O2_SUPPORTED_ADAPTER_DILIGENCE_RECEIPT.md`
- receipt path: exactly `docs/PHASE3_O2_SUPPORTED_INTERFACE_REFRESH_RECEIPT_20260827.md`

Research was limited to unauthenticated public OpenAI primary sources in the official `openai/codex` repository. No method name, implementation presence, experimental surface, issue report, search result snippet, or inference was treated as supported capability proof. A primitive is `PROVEN` only when the official pinned source explicitly defines all requested semantics; otherwise it is `NOT_PROVEN`.

## Immutable official sources consulted

All technical claims below cite commit-pinned official URLs rather than mutable `main` links.

1. [codex-app-server README · Protocol and API Overview](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server/README.md#protocol) — observed 2026-08-27 KST. Defines supported transports, marks WebSocket experimental/unsupported, and documents thread/list/read/name behavior.
2. [App Server v2 Thread schema · Thread fields](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L1333-L1467) — observed 2026-08-27 KST. Defines the complete `Thread` response fields including identifiers, preview, timestamps, status, path and cwd.
3. [codex-app-server-daemon README · lifecycle and remote-management status](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server-daemon/README.md#codex-app-server-daemon) — observed 2026-08-27 KST. Explicitly labels the daemon experimental and describes SSH-oriented lifecycle/bootstrap, not an O2 least-data query contract.

## Four-question determination

| # | Required supported semantic | Verdict | Official evidence and short paraphrase |
| --- | --- | --- | --- |
| 1 | Exact target lookup through one private alias without list-all/enumeration | **NOT_PROVEN** | The pinned [API Overview](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server/README.md#api-overview) documents `thread/read` by thread ID and `thread/list` with filters. `thread/name/set` names are not unique and name lookup resolves to the most recently updated thread. No supported request accepts an OUTCOME private alias and resolves exactly one target without enumeration. |
| 2 | Field-selective read returning only availability plus a semantically defined provider-observed timestamp, excluding content and identifiers by construction | **NOT_PROVEN** | `thread/read` returns a `Thread`. The pinned [Thread schema](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L1333-L1467) includes thread/session IDs, preview, project/provider metadata, created/updated/recency timestamps, status, path and cwd. The docs define no field selector and do not define any timestamp as the requested provider-observed availability timestamp. `includeTurns: false` only omits turns; it does not construct the required two-field response. |
| 3 | Supported read-only invocation from two distinct locations with defined auth/transport semantics and no experimental/unsupported transport | **NOT_PROVEN** | The pinned [Protocol](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server/README.md#protocol) defines stdio and a local Unix control socket, while WebSocket is explicitly experimental/unsupported for production. The pinned [daemon README](https://github.com/openai/codex/blob/a57b398351a803c9ec94e38042bc82f527bed2a4/codex-rs/app-server-daemon/README.md#codex-app-server-daemon) is itself experimental and documents lifecycle/bootstrap over SSH, not one authenticated least-privilege read primitive with defined two-observer semantics. |
| 4 | Official production-semantics evidence can be immutably cited at this exact OUTCOME source boundary | **PROVEN — receipt/citation only** | The three official sources above are pinned to immutable OpenAI repository commit `a57b398351a803c9ec94e38042bc82f527bed2a4`, and this receipt records them against exact OUTCOME source head/tree. This proves only a stable documentation baseline, including the explicit unsupported/experimental boundaries. It does not convert questions 1–3 to supported primitives and does not prove O2. |

## Delta from prior diligence

The prior receipt listed four missing primitives.

| Prior missing primitive | Refresh delta |
| --- | --- |
| 1. private alias → exact provider target without enumeration | Still **NOT_PROVEN**. Current official API docs expose ID read and list/filter surfaces; non-unique names are not an exact private alias contract. |
| 2. availability + provider-observed timestamp only | Still **NOT_PROVEN**. Current schema makes the broader response explicit and supplies no least-data selector or provider-observed timestamp meaning. |
| 3. supported two-location invocation with defined auth/transport | Still **NOT_PROVEN**. Production WebSocket remains explicitly unsupported; remote daemon lifecycle remains experimental and does not define the requested query semantics. |
| 4. immutable checked-in primary-semantics receipt at exact source boundary | **PROVEN by this committed refresh receipt only**, provided this file is committed as the direct documentation descendant of the recorded OUTCOME source. |

The delta changes the documentation-evidence gap only. It does not change the adapter verdict, O2 state, routing lock, evidence-continuity lock, Gate count or progress.

## Verdict and exact next boundary

Overall refresh verdict: `PARTIAL_NOT_PROVEN`.

The supported adapter remains blocked because required primitives 1–3 are `NOT_PROVEN`. O2 remains `OPEN/LOCKED`; production relay remains `NO_GO`; the smallest safe fallback remains `UNBOUND_MANUAL_NAVIGATION`.

The next eligible diligence slice requires new official primary documentation that explicitly defines all of the following together:

1. an exact private-alias resolver with no list/enumeration;
2. a response schema limited by construction to availability and a defined provider-observed timestamp;
3. one supported two-location read-only transport with explicit authentication and least-privilege semantics.

Method presence, experimental remote control, local name lookup, a filter, or a broader response cannot satisfy those requirements. Any real two-location execution still requires a separate time-bounded Cherry authorization after the interface is proven.

## Measured research and zero-operation counts

- official public web research tool calls: `9`
- official public Git HEAD resolution (`git ls-remote`): `1`
- evidence-bearing immutable official URLs: `3`
- provider login or authenticated API call: `0`
- local Codex thread/session list, read, resume or enumeration: `0`
- app-server/daemon start, bootstrap, remote-control or transport connection: `0`
- browser/device observation: `0`
- credential, cookie, token, private-store or private provider path access: `0`
- provider message, turn, session or external mutation: `0`
- product/test/runtime/API/UI/existing Gate/Map/Contract/Package/code mutation: `0`
- dependency install, test or build execution: `0`
- push/deploy/release/external message: `0`

The nonzero network activity above was limited to unauthenticated official public documentation retrieval and one read-only official Git repository HEAD resolution.

## Authority boundary and ABANDON

This receipt changes no existing Gate checkbox and grants no adapter, observation, routing, provider, release or completion authority. It does not claim real device use, availability, freshness, private alias resolution or two-location continuity.

**ABANDON:** public documentation diligence is not real two-location execution or authorization. Receipt completeness can satisfy only prior missing documentation primitive #4; questions 1–3, O2, Phase 3, QA, Release Audit, Cherry acceptance, release, progress and `EXTERNAL_OUTCOME_COMPLETE` remain open.
