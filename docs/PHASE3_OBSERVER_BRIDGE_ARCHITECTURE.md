# OUTCOME Phase 3 · Observer Bridge Architecture

Status: **CHERRY-APPROVED DIRECTION / SYNTHETIC BUILDER HANDOFF READY / HOSTED AND REAL-USE LOCKED**

Observed: 2026-08-27 KST

## Exact source and authority

- source commit: `70ecfef812ad89b0ed93bdaf5d2deae3cb02ff70`
- source tree: `4071afbd48d14b0cd2505b942834daf82e06d408`
- approved amendment: `docs/PHASE3_O2_OBSERVER_BRIDGE_CONTRACT_AMENDMENT.md`
- approval receipt: `docs/PHASE3_O2_OBSERVER_BRIDGE_APPROVAL_RECEIPT.md`

This architecture defines a future local synthetic candidate. It does not issue an implementation source pin, authorize hosted/account/provider/device work, or close O2.

## Relationship to current modules

The bridge is a new private ingest, authentication and ledger boundary. Existing modules remain unchanged and do **not** already implement this architecture.

| Existing module | Source-grounded capability | Boundary relative to the bridge |
| --- | --- | --- |
| `server/phase3-private-session-registry.mjs` | Project/role binding uniqueness, versioned bind/rebind/revoke, registry disable, audit and a synthetic locator boundary | Supplies design precedent for binding version and fail-closed lifecycle only. It does not own bridge sources, signing keys, signed events, viewers or the bridge ledger. |
| `server/phase3-observation-relay.mjs` | Exact six-state Korean NOW vocabulary, strict own-data materialization, source/sequence/freshness handling, conflict/reconnect, atomic mutation and read projection for a synthetic `source-a`/`source-b` topology | Supplies vocabulary and invariant precedent only. Option B has one authorized publisher and two viewers; the relay's two-source topology must not be reused as proof semantics. It verifies no signature and is not the bridge ingest. |
| `server/account-access.mjs` | Owner identity verification, membership/project authorization, private read-only workspace projection, revocation and operations guard contracts | Supplies hosted-stage authorization precedent only. It is not connected to bridge events, sources, keys or viewer queries. Real account-token verification remains a separately authorized hosted-stage adapter. |

No bridge implementation may mutate or wrap those modules implicitly. A future integration requires a separate contract and authorization.

## Architecture components and state ownership

| Component | Single responsibility and owner state |
| --- | --- |
| Local companion signer | Observes only an approved OUTCOME Package activity state, constructs the exact finite event, owns the private Ed25519 signing key and signs canonical bytes. It cannot read provider content or identifiers. |
| Private source/key registry | Constructor-supplied project/role/binding/source/key allowlist, active/revoked/replaced versions and public verification keys. No runtime registration API exists in the synthetic slice. |
| Bridge ingest verifier | Materializes hostile input, enforces the exact schema/scope/time/signature/order pipeline and returns finite public-safe outcomes. |
| Append-only event ledger | Accepted canonical event digests, safe quarantine/audit events, monotonically allocated revisions and lifecycle history. It never stores a private signing key. |
| Deterministic projection fold | Folds the immutable ledger and current clock into the last valid finite state, freshness and safe counts without mutating history. |
| Authenticated viewer query | Resolves an authorized private viewer record and project scope before reading. Synthetic viewer classes model location only; hosted token verification is absent. |
| Privacy-minimal dashboard adapter | Produces only the authorized project-safe view described below. Anonymous query has no private-project visibility. |
| Operations/audit | Revoke, rotate, disable/read-only, exact-revision restore, tombstone and immutable public-safe reason history. |

## Cryptographic recommendation

Use Node `crypto` Ed25519 asymmetric signatures.

- The future local companion alone owns the private signing key.
- The server registry stores only the corresponding public verification key and finite `key_version` state.
- Synthetic tests may call `generateKeyPairSync('ed25519')` and keep both ephemeral key objects in memory only. They must not serialize, print, export or write either key.
- Algorithm is exactly `Ed25519`; algorithm negotiation is absent in the first candidate.
- Every semantic field except `signature` is signed. Verification uses the constructor-bound active public key, never a key supplied by the event.
- `signature` is canonical unpadded base64url and must decode to exactly `64` bytes, the Ed25519 signature length. Non-canonical, padded or alternate encodings reject.

### Canonical signed bytes

The canonical field order is fixed:

```text
schema_version
project_id
role
binding_version
source_ref
source_version
key_version
sequence
observed_at
expires_at
status_code
```

Serialization is UTF-8 and begins with the ASCII domain separator `OUTCOME_OBSERVER_BRIDGE_EVENT_V1\n`. Each field is then encoded in fixed order as:

```text
<field-name>=<UTF-8-byte-length>:<canonical-value>\n
```

Integers use their shortest unsigned base-10 ASCII form with no sign or leading zero. Strings use their exact input bytes. This length-prefixed, fixed-order format is unambiguous across delimiter-bearing Unicode values. No JSON property order, locale, coercion or normalization participates in the signature.

NFKC, case, whitespace, alternate timestamp or alternate base64url variants are rejected rather than normalized. The event digest is SHA-256 over these canonical signed bytes and is private ledger correlation material, not completion authority.

## Strict event schema

An ingest event has exactly these own enumerable data properties and no optional or unknown keys:

| Field | Contract |
| --- | --- |
| `schema_version` | exact safe integer `1` |
| `project_id` | exact constructor-allowlisted primitive string |
| `role` | exact constructor-allowlisted finite role string |
| `binding_version` | positive safe integer matching the active source registration |
| `source_ref` | opaque private primitive string matching the active registration; never projected |
| `source_version` | positive safe integer matching the active source generation |
| `key_version` | positive safe integer matching the active public key generation |
| `sequence` | positive safe integer, monotonic within project/role/binding/source version |
| `observed_at` | exact canonical ISO UTC string |
| `expires_at` | exact canonical ISO UTC string, later than `observed_at` and within the configured freshness bound |
| `status_code` | exact primitive member of the six-state vocabulary |
| `signature` | canonical unpadded base64url Ed25519 signature |

The exact status vocabulary is `작업 준비 중`, `구현 진행 중`, `테스트 실행 중`, `검수 진행 중`, `결과 정리 중`, `응답 대기 중`. No free text is accepted.

Objects must be plain records with primitive own enumerable data properties. Accessors, symbols, arrays, boxed values, inherited data, Proxy/trap-dependent values and coercion are rejected before any caller-controlled getter or conversion is invoked.

## Constructor-only synthetic registration

The synthetic factory receives immutable source registrations. Each registration contains exactly:

```text
project_id, role, binding_version, source_ref,
source_version, key_version, public_key, status
```

`status` is finite `active|revoked`. Exactly one active registration may exist for a project/role/binding/source generation. Duplicate scopes, versions or public-key aliases fail construction. The registration set is copied and frozen before service state exists. The synthetic candidate exposes no create/register/import endpoint.

Synthetic viewer registrations are also constructor-bound and contain an opaque private `viewer_ref`, one finite `viewer_class` (`workstation|remote_device`), project allowlist and `active|revoked` status. `viewer_class` describes observation location only; it is neither identity nor authority. The private registration authorizes the viewer. Actual account tokens and memberships are hosted-stage work.

## Ingest validation and atomic commit order

Every ingest attempt follows this exact order:

1. enter the mutation/reentry guard;
2. materialize plain own data properties without getters, traps or coercion;
3. validate exact keys, primitive types, canonical representations and finite vocabulary;
4. resolve project/role/binding/source/source-version/key-version active scope;
5. validate canonical clock, `observed_at`, `expires_at`, future tolerance and freshness;
6. serialize the fixed canonical bytes and verify Ed25519 signature with the registry key;
7. calculate the private digest and evaluate sequence/idempotency/conflict/gap rules;
8. draft ledger, projection metadata and safe audit changes on a deep-independent state;
9. materialize the public-safe response clone;
10. atomically publish the draft once, or publish nothing.

All failures return or throw only a finite public-safe error code. No failure exposes which private source/key value exists, and no failure consumes ledger revision, audit/event ID or sequence. Clock, crypto, digest and clone dependencies are injectable only for hostile synthetic tests and default to Node primitives in a future implementation.

## Time and freshness

- Future tolerance is pinned to `5_000ms`, matching the current relay invariant.
- `freshness_ms` is a positive safe integer fixed at construction and shared by expiry validation and read-time projection.
- `expires_at` must be after `observed_at`, no later than `observed_at + freshness_ms`, and not expired at ingest.
- An observation older than `freshness_ms` at ingest rejects as stale; an observation more than `5_000ms` in the future rejects.
- On read, heartbeat loss or passage beyond `expires_at`/freshness yields `stale` or `offline` with `status_code: null`. It does not append a fabricated activity event or progress.
- Invalid, non-finite, throwing or out-of-ISO-range clock results fail public-safely with no mutation.

## Sequence, idempotency and quarantine

- First valid event establishes the sequence baseline.
- Same sequence plus the same canonical digest is idempotent and returns the existing ledger revision.
- Same sequence plus a different digest is `duplicate_conflict` and quarantines the source projection.
- Lower sequence is `out_of_order` and cannot replace the last valid event.
- A jump greater than one is `sequence_gap` and quarantines the source until explicit resync.
- Quarantine stores only safe reason, prior/current sequence classes and private digest references; the rejected event is not accepted as activity.
- Recovery requires an explicit resync operation bound to expected source/key/binding version and last accepted sequence. There is no automatic replay or redelivery.

## Projection and viewer authorization

An authorized viewer may receive only:

```text
project_id
role
binding_version
status_code|null
freshness_class: fresh|stale|offline|unknown|conflicting
observed_time_class: current|aged|expired|unavailable
ledger_revision
accepted_count
conflict_count
```

Exact `source_ref`, source/key versions, key, signature, event digest/ID, raw `observed_at`/`expires_at`, viewer reference and audit internals remain private. The dashboard adapter may localize finite labels but cannot reconstruct source data. Anonymous, wrong-project, wrong-viewer-class, revoked or missing viewer access returns one non-enumerating denial and no project presence.

The synthetic proof uses exactly the `workstation` and `remote_device` location classes. It must demonstrate equivalent projection/revision, but this is not real account authentication or real two-location evidence.

## Operations, audit and lifecycle

- `revokeSource`: expected source and registry revision; immediately stops ingest and projects stale/offline.
- `rotateKey`: expected source/key/registry revision; activates one new public key version and revokes the old key atomically. Sequence continuity requires an explicit resync baseline; old-key events fail.
- `disable`: expected ledger revision; rejects writes and exposes only authorized read-only projection with computed freshness.
- `restore`: exact disabled revision plus expected registry revision; enables ingest without replay or ID reuse.
- `resync`: explicit expected source/key/binding/last-sequence CAS and one newly signed baseline.
- `tombstone`: authorized, revision-bound deletion state that removes private event material after the pinned retention window while preserving only finite audit/count/digest-class evidence; no raw resurrection.

Every successful lifecycle transition appends an immutable safe audit record. Failed operations are atomic and may append a bounded safe failure record only when doing so cannot create an oracle or consume the success sequence. Retention duration, export authorization and physical store implementation remain hosted-stage decisions; the synthetic model proves only bounded state semantics.

## Threat model

| Threat | Required control |
| --- | --- |
| Forged or tampered event | Ed25519 verification over all semantic fields; registry-bound public key |
| Cross-project/role/binding injection | Exact constructor allowlist and active version checks before signature outcome disclosure |
| Replay, conflicting duplicate or gap | Digest idempotency, quarantine, explicit CAS resync, no automatic replay |
| Stolen/replaced key | Versioned rotation/revocation, old-key denial, no private key server storage |
| Parser/accessor/Proxy reentry | Descriptor-first primitive materialization and mutation guard before property evaluation |
| Clock rollback/future/expiry | Canonical time, fixed future tolerance, bounded freshness and fail-closed clock |
| Viewer enumeration or privilege by class | Private viewer registration and project authorization; class alone grants nothing |
| Private metadata disclosure | Minimal projection, finite error/reason codes, no raw timestamps/source/key/digest IDs |
| False progress | NOW-only activity meaning and prohibited progress/Gate/authority fields |
| Disable/restore or deletion drift | Expected-revision CAS, append-only audit, tombstone and no identifier reuse |

## Rollback

The first rollback is local and state-contained: disable ingest at the exact ledger revision, keep viewer queries read-only with freshness decay, revoke active source/key versions, and preserve immutable safe audit. Reverting future code does not reactivate a key, replay an event, delete evidence or enable provider access. Hosted rollback, key custody and data-store recovery require a separately authorized runbook.

## Staged delivery boundary

1. local synthetic ledger candidate;
2. fresh independent QA of the immutable synthetic candidate;
3. separately authorized hosted account-auth adapter;
4. fresh hosted QA;
5. time-bounded 10-minute real two-viewer O2 proof;
6. separate Release Audit and Cherry acceptance.

Planner Routing remains locked until revised O2 evidence closes. A synthetic QA PASS only makes the hosted stage eligible; it does not close O2 or authorize hosting.

## ABANDON

Architecture completeness is not an implementation pin, hosted authorization, real viewer observation, provider activity proof, progress, Gate closure, routing authority, QA, Audit, release or Cherry acceptance.
