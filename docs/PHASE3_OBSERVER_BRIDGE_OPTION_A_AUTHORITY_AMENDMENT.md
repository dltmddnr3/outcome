# Phase 3 Observer Bridge · Option A Authority Amendment

Status: **CHERRY APPROVED / LOCAL CORRECTION AUTHORIZED / REMOTE APPLICATION LOCKED**

Decision date: 2026-08-27 KST

## Immutable decision basis

- failed candidate: `b0aef3a1af681c554d7c898e0e1d44a54466a456`
- failed candidate tree: `04ba7320c7b9eb09f232f3f38d2f3aa5c50eb3dc`
- fresh QA report carrier: `7ab8c7619872b03ebc16dafe2449dc75a7f3edb7`
- fresh QA report tree: `5f622360878ca15865d8ac871966b5fa508cd67e`
- decision packet SHA-256: `31725a4d9006fe7894b4b61fe66d48f931b409ebbe48c907d9222ff9a383dfd9`
- QA report SHA-256: `389ca894e30c385a0cf5d867f34620d370ec54d39e8cfaf9b3f4023d448568b3`
- Cherry decision: Option A approved in the Planner conversation on 2026-08-27 KST.

This amendment records the approved semantic direction. It does not claim that the failed candidate is repaired and does not authorize any remote database, provider, credential, environment, deployment, release, or real-device mutation.

## Accepted authority model

OUTCOME accepts one dedicated server-only bridge backend role as the trusted private mutation boundary for the MVP. The role must be `NOLOGIN` and `NOBYPASSRLS`, remain outside the Data API, browser, mobile client and local companion, and receive only the table/action grants required by bridge transactions. `anon` receives no bridge access. Authenticated viewers may read only their server-derived owner-authorized workspace/project projection under exact RLS predicates.

The application must verify owner or companion authority before opening the transaction: workspace, project, role, binding version, source version, key version, signature, replay, clock, body, rate and feature state. Every SQL operation must carry the exact verified scope. Composite keys, uniqueness, finite constraints, CAS revisions and append-only rules defend against mistakes and scope drift.

The backend credential is server-only, separately rotated, excluded from logs and clients, monitored, revocable and governed by an ingest kill switch. It is not the platform-wide `service_role` and cannot access unrelated account data.

## Explicit accepted residual risk

Option A does **not** provide bridge-row isolation after full compromise of the trusted bridge backend process or credential. RLS and `NOLOGIN`/`NOBYPASSRLS` must never be described as preserving tenant isolation against that compromise. This is an accepted MVP residual risk, not a proven security property.

## Mandatory correction invariants

1. Remove mutable custom PostgreSQL GUC values as proof of tenant, project, role, binding, source or key authority.
2. Prove operations compatibility under declared effective roles with forced RLS for activate, append, rotate, revoke, tombstone, manifest verification and restore. Broad unrelated-schema grants are forbidden.
3. Replace caller-declared restore truth with a versioned immutable stored manifest or injected immutable manifest port. Verify manifest revision, schema version, exact tombstone digest/coverage, durable revision and restore receipt transactionally; every missing, conflicting, stale, incomplete or inaccessible state fails closed.
4. Use opaque random ledger row identity, preferably UUIDv7-like values generated before transaction, with uniqueness enforced. Ordering remains a separate ledger revision/sequence contract; no contiguous row-ID claim is permitted.
5. Define one finite future-clock-skew interval and test below, exactly at and above its boundary. Beyond-boundary observations cannot publish projection, NOW or progress.
6. Tombstone deletion must purge raw source/certificate material or retain only a one-way non-reconstructive deletion-receipt digest. Restore must reapply tombstones without raw resurrection.
7. Anonymous presence leakage, public mutation behavior and existing public read-only semantics remain unchanged.
8. Feature defaults off. No local candidate activates a hosted bridge or proves O2.

## Locked outcome boundary

This approval authorizes only a bounded local correction candidate, local PostgreSQL-compatible proof, immutable Builder receipt, fresh independent UX & Product QA and a separate fresh Release Audit. It does not authorize Supabase/provider application, remote database creation or migration, credential creation/rotation, environment changes, network resources, hosted wiring, deployment, push, release, real companion enrollment or the real two-viewer observation.

O2 remains `OPEN/LOCKED`, Phase 3 remains `17/43`, Routing T1-T7 remains locked, and `EXTERNAL_OUTCOME_COMPLETE=false`.

## ABANDON

**ABANDON:** this amendment records Cherry's Option A risk decision and bounded local correction authority only. It is not implementation, QA, Audit, deployment, O2 evidence, progress, acceptance, release, or external completion.
