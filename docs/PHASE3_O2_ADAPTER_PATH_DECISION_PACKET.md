# OUTCOME Phase 3 · O2 Adapter Path Decision Packet

Status: **DECISION PACKET READY / CHERRY DECISION REQUIRED / NO CONTRACT OR SOURCE AUTHORITY**

Observed: 2026-08-27 KST

## Exact source and decision boundary

- source commit: `e27fc70d1ccd65639e77e60348a95ce5eca26f7b`
- source tree: `865aa797daaa32d4f3307b44434ff91b5ca2d9ba`
- current official-interface receipt: `docs/PHASE3_O2_SUPPORTED_INTERFACE_REFRESH_RECEIPT_20260827.md`
- current O2 Gate: `GATES_PHASE3_MULTI_PC_OBSERVATION_RELAY.md`
- finite activity vocabulary: `docs/PHASE3_MULTI_PC_OBSERVATION_NOW_VOCABULARY_AMENDMENT.md`

The current supported-native-adapter result is unchanged: exact private-alias lookup without enumeration, a field-selective availability plus provider-observed timestamp read, and a supported two-location authenticated read transport are all `NOT_PROVEN`. Only the immutable official-source citation baseline is `PROVEN — receipt/citation only`. O2 therefore remains `OPEN/LOCKED`, production relay remains `NO_GO`, and the current fallback remains `UNBOUND_MANUAL_NAVIGATION`.

This packet presents a decision. It does not amend the Contract, Map, O2 procedure or Gate, authorize implementation, close O2, or create progress.

## Decision question

Cherry must choose whether to keep waiting for provider-native semantics or explicitly redefine O2 around an OUTCOME-owned observation surface. The four paths below are mutually exclusive for the next Phase 3 direction.

## Mutually exclusive paths

### A · Wait for a future supported native Codex adapter

Keep the current O2 semantics: two locations must directly use a supported provider surface with exact target, least-data and authenticated transport guarantees.

- Benefit: no semantic change and no OUTCOME-owned publisher to trust.
- Cost: primitives 1–3 are not currently proven, so O2 and Planner Routing remain blocked indefinitely until official support exists.
- Current verdict: `SAFE WAIT / O2 OPEN/LOCKED`.

### B · RECOMMENDED CANDIDATE · OUTCOME-owned Observer Bridge

Define a minimal account-authenticated local OUTCOME Package companion on the work PC. The companion publishes only a finite `status_code`, monotonic `sequence`, active `binding_version`, and signed `observed_at` into a private OUTCOME server ledger. Other authenticated devices read the same private OUTCOME projection.

The bridge never reads or transports Codex prompt, result or thread content; raw provider/session/thread/turn identifiers; provider private stores; credentials; filesystem paths; or UI pixels. Missing heartbeats degrade to stale/offline and never become progress.

This is not a provider-native adapter. It changes O2 proof semantics from “two independent locations directly read the provider” to “two independent authenticated viewers observe the same OUTCOME-owned signed projection.” Cherry must explicitly approve that contract change before any Contract/Map/Gate amendment or implementation.

- Benefit: directly serves the underlying cross-device observability outcome using OUTCOME-owned, supportable surfaces.
- Cost: status correctness depends on the local companion emitting authentic signed finite events, not provider-native introspection.
- Current verdict: `RECOMMENDED FOR CHERRY DECISION / NOT ADOPTED / NO IMPLEMENTATION AUTHORITY`.

### C · Manual two-device attestation

Have a person inspect the project from two devices and record a bounded attestation.

- Benefit: useful for UX exploration and understanding viewer needs.
- Cost: not continuous and not a source-grounded runtime observation.
- Current verdict: `UX EXPLORATION ONLY / REJECTED AS O2 EVIDENCE`.

### D · Unsupported extraction or transport

Use UI scraping, a provider private database, hidden endpoints, or experimental remote transport.

- Benefit: none that justifies the privacy, support and durability risks.
- Cost: unsupported semantics, content/identifier exposure, brittle coupling and non-auditable failure behavior.
- Current verdict: `REJECTED`.

## Decision comparison

| Path | Outcome fit | Provider dependency | Privacy | Automation fidelity | Implementation cost | O2 contract change | Current verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A · Wait | Exact fit to current native-read wording, no current delivery | High; blocked on future official primitives | Strongest because no new data plane | None until support exists | Low now, unbounded delay | None | Safe but indefinitely blocked |
| B · Observer Bridge | Strong fit to cross-device observability goal | Low for transport; local publisher supplies status truth | Strong if finite signed events and prohibited-field zero are enforced | Continuous OUTCOME-owned heartbeat and state projection | Medium to high: companion, private ledger, auth, operations | **Yes; explicit Cherry approval required** | **Recommended candidate, not adopted** |
| C · Manual attestation | Partial UX-learning fit | Human/provider UI dependent | Variable and difficult to bound | Low and discontinuous | Low | Would weaken evidence if misused | Exploration only; rejected as O2 evidence |
| D · Scraping/private/experimental | Superficial only | High and unsupported | Unacceptable | Fragile and unverifiable | High ongoing cost | Invalid shortcut | Rejected |

## Option B · decision-level minimum

The following is the minimum boundary for a future amendment and architecture handoff. It is not an implementation specification or authorization.

### Identity and authority

- Publisher identity is separate from every role/session binding.
- Server authorization applies an account and project allowlist and accepts exactly one active binding version.
- The client, viewer or submitted project selector never creates authority.
- Replaced, revoked, cross-project, wrong-account or wrong-binding publishers fail closed.

### Finite activity event

`status_code` is an exact primitive value from the current relay vocabulary, with no free text:

- `작업 준비 중`
- `구현 진행 중`
- `테스트 실행 중`
- `검수 진행 중`
- `결과 정리 중`
- `응답 대기 중`

The event also carries a monotonic `sequence`, active `binding_version`, and signed `observed_at`. Event authentication and signature verification must be server-side. The future architecture must pin key lifecycle, signature algorithm and rotation without placing credentials or signing material in the browser.

### Ordering, freshness and failure

- Exact duplicates are idempotent; conflicting duplicates fail closed and append public-safe conflict evidence.
- Out-of-order, gap, replay, invalid signature, wrong binding and future-clock events cannot replace the last valid projection.
- Freshness is bounded using the existing relay’s source-grounded rules; the future amendment must pin the exact threshold before implementation.
- A missing heartbeat becomes stale/offline. Stale, offline, unknown, conflict, gap, disconnect and clock failure expose no active NOW and never imply progress.

### Ledger and projection

- A server-side private registry owns publisher, account, project and active-binding authorization.
- An append-only private ledger owns accepted event history and safe conflict/recovery evidence.
- Authenticated viewers read one private dashboard-safe projection of finite state, freshness class and safe timestamps/counts.
- If an anonymous public-safe projection is ever separately approved, it may contain only finite state/count/freshness/reason classes. It cannot expose private project presence by default.
- Raw prompt/result/thread content, provider/session/thread/turn IDs, provider locators, paths, credentials, email/account identity, UI pixels and arbitrary metadata have a required hit count of `0` in events, receipts, logs and projections.

### Two-location meaning

Two locations are independent authenticated viewers of the same OUTCOME-owned signed projection. They are not two independent provider readers. Real proof must demonstrate viewer independence, matching immutable ledger revision, freshness behavior and authorization denial without relabeling the bridge as Codex-native observation.

### Progress and work authority

- NOW means only actual accepted bridge activity.
- NOW, heartbeat, sequence, availability and freshness never close a Gate or determine progress.
- QA, Release Audit, Cherry acceptance, release and `EXTERNAL_OUTCOME_COMPLETE` remain separately evidenced authorities.
- The bridge has no chat, prompt, result, message or dispatch channel. Planner Routing T1–T7 remains separately locked until revised O2 evidence closes under an approved contract.

### Lifecycle, privacy and rollback

- Disable, publisher revoke, account/project revoke, rebind and exact-revision rollback must fail closed without ID or sequence reuse.
- Rebinding preserves old and new histories; it does not inherit active truth across versions.
- Evidence is append-only and public-safe. Private retention, authorized export, deletion/tombstone behavior and audit without raw resurrection must be pinned before hosted use.
- Local companion install, update, health, uninstall and rollback are future scopes.
- Private server hosting, account authentication, signing-key operations, monitoring and incident recovery are future scopes.
- None of those scopes is authorized by this packet.

## Recommendation

**Recommend Option B for Cherry’s contract decision because it meets the underlying cross-device observability goal with supported OUTCOME-owned surfaces while keeping provider content and identifiers out of the observation path.**

The tradeoff is explicit: status correctness depends on the local companion emitting authenticated, signed, finite events. It does not come from provider-native introspection and must never be presented as such.

## If Cherry approves Option B

Approval would authorize only the next Planner sequence, not implementation or progress:

1. Amend the Phase 3 Contract, Map, O2 procedure and O2 Gate semantics to state the Observer Bridge proof model and its limits.
2. Issue a separate architecture contract and immutable Builder preflight with exact source pin, allowed paths, tests, privacy and rollback.
3. Implement and independently verify a local synthetic candidate, then a separately authorized account-authenticated hosted candidate.
4. Run fresh independent UX/Product QA against the immutable candidate.
5. Produce real two-viewer proof with independent authenticated locations, source revision, freshness and denial evidence.
6. Run a separate fresh Release Audit.
7. Request Cherry acceptance separately.

No Phase, Scope, Stage, Gate, percentage or completion state changes during amendment or preflight. T6 provider dispatch and T7 real-use remain separately locked unless their own future contracts are approved and evidenced.

## Operation counts

- product/test/runtime/API/UI mutation: `0`
- existing Contract/Map/procedure/Gate/receipt/Package mutation: `0`
- provider/session/thread/browser/device/private-store operation: `0`
- credential/path/UI-pixel inspection: `0`
- dependency install, test or build: `0`
- network/provider operation: `0`
- push/deploy/release/external message: `0`

## Authority boundary and ABANDON

This packet grants no source, implementation, provider, observation, routing, evidence, QA, Audit, release, progress or acceptance authority. It changes no adopted OUTCOME contract.

**ABANDON:** decision-packet completeness is not Cherry approval, a Contract/Map/Gate amendment, implementation, real two-location evidence or O2 completion. O2, Planner Routing T1–T7, Phase 3, QA, Release Audit, Cherry acceptance, release and `EXTERNAL_OUTCOME_COMPLETE` remain open.
