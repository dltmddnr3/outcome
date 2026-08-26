# OUTCOME Phase 3 · O2 Observer Bridge Contract Amendment

Status: **CHERRY-APPROVED ADDITIVE AMENDMENT / IMPLEMENTATION NOT AUTHORIZED / O2 OPEN**

Observed: 2026-08-27 KST

## Approval and exact source

- source commit: `195f3db0c0dc32748042d87b0b8054fc23e891a1`
- source tree: `c29b5f060a371ec367a30cc8cde078b812426b28`
- approval receipt: `docs/PHASE3_O2_OBSERVER_BRIDGE_APPROVAL_RECEIPT.md`
- exact Cherry decision input: `추천옵션 적용`
- adopted direction: `Option B · OUTCOME-owned Observer Bridge`

This additive amendment defines the approved O2 observation-source meaning. It grants no implementation, hosted-runtime, provider, device, deployment, release or progress authority.

## Precedence and scope

For **O2 observation-source semantics only**, this amendment supersedes:

- the direct-provider-read assumptions in `docs/PHASE3_O2_REAL_TWO_LOCATION_PROCEDURE.md`; and
- the first-adapter/private-picker assumptions in `docs/PHASE3_EXISTING_SESSION_OPERATIONS_CONTRACT.md`.

It does not supersede or modify:

- project role/session registry ownership, uniqueness, versioning or replacement history;
- Planner-only routing and its T1–T7 authority boundary;
- instruction, result, evidence and authority separation in E1–E6;
- existing Gate counts or evidence already accepted under their own immutable receipts;
- fresh QA, separate Release Audit, Cherry acceptance, release or external-completion boundaries;
- any unrelated Phase 2, Phase 3 or OUTCOME contract.

Existing files are not edited by this amendment. Reconciliation into OUTCOME Contract, Map and the broader Phase 3 contract is pending because the canonical working tree has unrelated overlapping uncommitted changes. Their contents are not inferred, adopted or committed here.

## Adopted Observer Bridge semantics

### Publisher and viewers

- A local, account-authenticated OUTCOME Package companion on the authorized work PC is the observation publisher.
- Publisher identity is separate from provider/session identity and from the role/session binding.
- Mac mini and MacBook/mobile clients are independent authenticated viewers of the same private, signed OUTCOME projection.
- Two viewers are not two independent provider readers. The projection must never be described as provider-native introspection.

### Finite event contract

The publisher may emit only the following typed classes:

- `project_binding_ref`: opaque private project-binding reference class;
- `role`: finite authorized project-role class;
- `binding_version`: exact active binding version;
- `source_id`: opaque private publisher-source class;
- `status_code`: one exact primitive value from the finite vocabulary below;
- `sequence`: monotonic source sequence;
- `observed_at`: signed observation timestamp;
- expiry/freshness data: bounded typed values pinned by the future architecture;
- signature/auth metadata: private-only, versioned and never projected to clients.

The exact `status_code` vocabulary is:

- `작업 준비 중`
- `구현 진행 중`
- `테스트 실행 중`
- `검수 진행 중`
- `결과 정리 중`
- `응답 대기 중`

No free text, prompt, result, content, link, path or arbitrary metadata is accepted. A future architecture must pin primitive validation before coercion, exact timestamp/freshness bounds, signature algorithm, key lifecycle and canonical signing representation before implementation can be authorized.

### Zero provider-native introspection

The bridge does not read, receive, transport, store or infer:

- Codex/provider prompt, result or thread content;
- raw provider/session/thread/turn identifiers or locators;
- provider private stores, hidden endpoints or experimental remote transports;
- credentials, tokens, cookies, keys or filesystem paths;
- browser/device UI pixels, screenshots or scraped accessibility/DOM content.

Prohibited provider/content/identifier/path/credential/UI-scrape/provider-operation hits must remain `0` in publisher input, ledger, audit, logs, projection and receipt.

### Server verification and atomic failure

Before one atomic ledger mutation, the private server verifies:

- authenticated publisher account and project allowlist;
- exact project, role, active `binding_version` and `source_id` authorization;
- signature and active key version;
- monotonic sequence, duplicate identity, conflict and gap rules;
- bounded freshness, expiry and clock safety.

Wrong account/project/role/binding/source, invalid or revoked key, bad signature, replay, conflicting duplicate, gap, expired/future clock or malformed input fails with no partial mutation and no event/sequence consumption. Missing heartbeat, expiry or disconnect becomes stale/offline/unknown. No failure path can synthesize progress, completion or approval.

### Private ledger and projection

- The server owns a private publisher registry, active source/binding/key versions and an append-only observation ledger.
- Authorized viewers read only a privacy-minimal private projection: finite activity state, availability/freshness class, safe observation time class, ledger revision and bounded public-safe counts/reasons.
- Client selection cannot grant project or projection authority.
- Anonymous surfaces expose no private-project presence by default.
- A count-only public-safe receipt may prove a bounded O2 run without raw account, project, source, binding, event or viewer identifiers.

### NOW and authority

NOW means only the last valid, fresh Observer Bridge event accepted by the private ledger. It is not:

- provider-native activity proof;
- Builder success or a delivery/result receipt;
- Gate evidence or progress;
- QA, Release Audit, Cherry acceptance, release or completion.

Stale, offline, unknown, conflict, gap, revoked source, invalid signature and clock failure expose no active NOW. Activity count, heartbeat frequency, sequence or elapsed time never creates progress.

The bridge is a read-model observation channel only. It has no prompt, result, chat, message, command or dispatch capability. Planner Routing T1–T7 and Evidence Continuity E1–E6 remain separately locked.

### Lifecycle, privacy and rollback

- Revoke and rebind use explicit version transitions; old and new histories remain separate and no active truth is inherited automatically.
- Disable blocks publisher writes while preserving an authorized read-only last-known projection with explicit freshness state.
- Restore requires an exact authorized revision and cannot reuse source, key, sequence or audit identifiers.
- Signing keys require versioned rotation and revocation; revoked keys cannot append or resume a prior sequence.
- Accepted events and safe failures append immutable audit evidence without raw data resurrection.
- Private retention is bounded; authorized export is scoped; deletion creates an auditable tombstone and cannot reconstruct deleted raw/private material.
- Rollback disables bridge ingestion and authenticated projection serving at the approved revision without enabling provider access or deleting immutable safe audit history.

Local companion install/update/uninstall, private server hosting, account authentication, signing key operations, retention infrastructure and incident recovery are future implementation scopes. They are not authorized here.

## Revised future O2 PASS semantics

O2 remains open. A future separately authorized proof may satisfy the revised semantics only when all seven conditions are directly evidenced against one immutable candidate:

1. one approved project, role and binding emits a valid finite signed event from the authorized local companion;
2. two distinct authenticated viewer locations independently read the same immutable ledger revision and projection within the freshness window;
3. wrong account/project/binding/source, replay/conflict/gap, expiry and revoked-key denial are directly observed;
4. prohibited content, identifier, path, credential, UI-scrape and provider-operation hits equal `0`;
5. provider mutation, chat/routing operation and other-session change counts equal `0`;
6. stale/offline behavior after heartbeat loss is directly observed without active NOW or progress;
7. a public-safe count-only receipt records the proof without private identifiers or payload.

Any missing, inferred or unavailable condition leaves O2 `FAIL` or `BLOCKED`, never PASS.

## Exact dependency chain

1. this Observer Bridge definition;
2. separate architecture contract and immutable Builder preflight;
3. local synthetic implementation candidate;
4. separately authorized account-authenticated hosted candidate;
5. fresh independent UX/Product QA;
6. real two-viewer O2 proof;
7. Planner Routing remains a separate locked dependency even after O2;
8. separate fresh Release Audit and Cherry acceptance.

No step inherits authority from the prior one. Definition and preflight do not count as implementation or progress.

## Current state

- Phase 3 progress: `17/43` unchanged;
- O2: `OPEN/LOCKED`;
- Planner Routing T1–T7: open and separately locked;
- Evidence Continuity E1–E6: open and separately locked;
- Phase 3 completion: open;
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## Authority boundary and ABANDON

**ABANDON:** this additive definition records Cherry’s selected observation-source semantics only. It is not source authority for code, architecture completion, real use, O2 PASS, routing, evidence sufficiency, QA, Audit, release, Cherry acceptance, progress or external completion.
