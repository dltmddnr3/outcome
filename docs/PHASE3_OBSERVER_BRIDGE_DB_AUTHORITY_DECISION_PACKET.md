# Phase 3 Observer Bridge · DB Authority Decision Packet

Status: **DECISION REQUIRED / H3-H4 CORRECTION LOCKED / NO SOURCE OR DEPLOY AUTHORITY**

Observed: 2026-08-27 KST

## Decision boundary

- Source report commit: `7ab8c7619872b03ebc16dafe2449dc75a7f3edb7`
- Source report tree: `5f622360878ca15865d8ac871966b5fa508cd67e`
- Failed candidate: `b0aef3a1af681c554d7c898e0e1d44a54466a456`
- Evidence: `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_FRESH_QA_B0AEF3A.md`
- Current migration is an unapplied failed candidate. No correction, hosted wiring, database application, deployment, or progress change is authorized by this packet.

## The decision in plain language

The failed candidate tried to scope one backend PostgreSQL role with custom GUC values read through `current_setting(...)`. That is not a durable database authority boundary: a session using that role can change its own custom GUC and select a different workspace or project. The policies also omitted role, binding, source, source-version, and key-version predicates.

`NOLOGIN` prevents direct login and `NOBYPASSRLS` prevents automatic RLS bypass, but neither makes a session-controlled GUC immutable. A single shared backend role therefore cannot use mutable GUC values as cryptographic proof of which workspace/project/role/binding/source it represents. We must not describe such a policy as protecting bridge rows after compromise of that backend role or process.

The material decision is whether the MVP accepts the backend process and its dedicated database credential as a trusted private mutation boundary, or requires stronger database-enforced tenant isolation at materially higher operational cost.

## Mutually exclusive options

### A · Recommended for MVP — trusted private backend mutation role boundary

Keep ordinary client access strongly constrained:

- `anon` receives no bridge schema/table access.
- `authenticated` viewers receive only their exact owner-authorized workspace/project projection through RLS.
- One dedicated `NOLOGIN`, `NOBYPASSRLS` bridge backend role receives only the table/action grants needed for bridge transactions and explicit all-bridge-row policies limited to the private bridge tables.
- The bridge role is never exposed to the Data API, browser, mobile client, or local companion and cannot access unrelated account data.

Move exact mutation authority to the trusted application boundary:

- Before opening a transaction, the application verifies owner authorization or companion Ed25519 certificate/signature as applicable, plus workspace, project, role, binding, source, source version, key version, replay, clock, body, rate, and feature-state rules.
- Every SQL statement includes the exact verified scope. Composite foreign keys, uniqueness, finite constraints, CAS revisions, and append-only rules catch application mistakes and scope drift.
- The backend credential is server-only, separately rotated, excluded from logs and clients, protected by network/runtime boundaries, monitored, revocable, and governed by an ingest kill switch.

Explicit residual risk: this model protects against untrusted clients and many application/query mistakes, but it does **not** isolate bridge rows after full compromise of the bridge backend process or credential. This is compatible with the usual Supabase trusted-server convention without exposing platform-wide `service_role`; the recommendation is a narrower dedicated bridge role.

Acceptance condition: Cherry must explicitly accept that residual risk before the hosted architecture/brief is amended and before a Builder correction source pin is issued.

### B · Per-workspace or per-source database roles/credentials

Create isolated roles or credentials per workspace/source so compromise of one credential does not authorize every bridge row.

- Stronger database isolation after application credential compromise.
- Requires enrollment-time role/credential creation, rotation/revocation, secret distribution, connection-pool partitioning, cleanup, monitoring, and potentially one pool per authority unit.
- Operational role and secret count grows with workspaces/sources; common pooled serverless/Supabase patterns become substantially harder and more expensive.

Verdict: viable future hardening, not the MVP recommendation without a dedicated operations design and cost decision.

### C · Private `SECURITY DEFINER` / RPC capability

Put mutation logic behind tightly scoped database functions that validate scope internally.

- Potentially reduces direct table grants.
- Creates a complex callable privilege surface; `PUBLIC` execute must be revoked, search path and ownership must be pinned, inputs must be authenticated inside the function, and RLS bypass behavior must be separately proven.
- No SQL-side Ed25519 verification and full authorization contract is currently defined. A mistaken function can bypass RLS more completely than the failed role design.

Verdict: rejected for the current candidate. It requires a separate architecture/security review, not a patch to the failed migration.

### D · Pause the hosted Bridge or select another isolated broker/storage

Do not host the Observer Bridge until a different authority/storage boundary is selected and proven.

- Introduces no new database credential risk.
- Blocks O2 and all downstream routing indefinitely.
- A separate broker may improve isolation but adds a new service, auth model, retention policy, cost surface, and operational burden.

Verdict: safest no-new-risk option, with an explicit indefinite product delay.

## Decision table

| Dimension | A · Trusted bridge backend | B · Per-scope DB roles | C · Private RPC | D · Pause/change storage |
|---|---|---|---|---|
| Protection from clients | Strong: client RLS and no raw grants | Strong | Potentially strong if every function boundary is proven | Strong by absence |
| Protection after backend compromise | **No bridge-row isolation; accepted residual risk required** | Strongest of listed DB options | Depends on function credential/owner compromise; not proven | No new bridge backend risk |
| Operational complexity | Moderate | Very high | High and security-sensitive | Low now; future redesign unknown |
| Supabase/Data API fit | Good when dedicated role stays server-only and outside Data API | Weak with pooled/serverless role explosion | Possible but high-risk; not designed | N/A |
| Local testability | High: grants, constraints, app auth, transactions and RLS can be tested | Medium; role lifecycle/pooling adds gaps | Medium-low; function privilege and crypto semantics unresolved | No implementation to test |
| Time/cost | Lowest viable MVP path | High ongoing cost | High design/audit cost | Immediate delay; unknown replacement cost |
| Current verdict | **RECOMMENDED CANDIDATE, Cherry acceptance required** | Future hardening candidate | Rejected for current candidate | Valid safe stop |

Recommendation: **Option A**. It preserves exact client isolation and a narrow private database surface while acknowledging the truth that status correctness and mutation isolation depend on the trusted OUTCOME backend. It must never be represented as RLS protection against compromise of that backend credential/process.

## Corrections required regardless of the selected authority option

These findings do not depend on choosing A, B, C, or D. If implementation resumes, they require their own RED-first correction and fresh QA.

### F2 · Effective-role operations compatibility

- Align the operations role's grants and policies with every exact SQL statement used for activate, append, rotate, revoke, tombstone, manifest verification, and restore.
- Run success and denial tests under the declared effective roles with forced RLS, never only as the database owner.
- Preserve least privilege and exact table/action bounds; do not fix the defect with broad unrelated-schema access.

### F3 · Restore authority must be evidence-backed

- Replace caller-provided `tombstones_applied: true` and arbitrary digest acceptance with a versioned stored backup-manifest record or injected immutable manifest port.
- Content-address the exact tombstone set and transactionally verify manifest revision, schema version, tombstone coverage, durable revision, and restore receipt before reads can resume.
- Missing, conflicting, incomplete, stale, or inaccessible manifest evidence fails closed.

### F4 · Evidence identity semantics

- Do not claim contiguous PostgreSQL sequence IDs survive rollback without gaps.
- Recommended correction: ledger-generated random opaque identifiers, preferably UUIDv7-like values generated before the transaction and protected by unique constraints. A failed transaction may consume an unobservable candidate value, but no persisted or public contract relies on contiguity.
- Alternatively, explicitly amend the contract to allow sequence gaps. The recommended path is opaque random identity because monotonic ordering already belongs to ledger revision/sequence fields, not row identity.

### F5 · Future timestamp denial

- Define one allowed clock-skew interval.
- Reject observations beyond the exact future-skew boundary before projection publication; test below, at, and above the boundary.
- A negative age must never create fresh NOW or progress.

### F6 · Tombstone privacy residue

- Purge the raw source row or replace retained source/certificate values with a one-way deletion receipt digest that cannot reconstruct the source reference.
- Define the retained privacy class explicitly, include it in the manifest/tombstone set, and verify backup restore reapplies the deletion without raw resurrection.

## If Cherry approves Option A

The exact next actions are:

1. Planner creates an additive hosted architecture and Builder brief amendment stating the trusted-backend authority model and residual risk.
2. Planner issues a new exact HEAD/tree source pin for a bounded Builder correction.
3. Builder corrects only the migration, Postgres/operations adapters, tests, and correction receipt, including F2-F6.
4. Fresh independent QA re-runs hostile effective-role, restore-manifest, identity, future-clock, tombstone, privacy, and regression probes.
5. No remote database application or deployment occurs in those steps; later hosted authorization remains separate.

The amendment/preflight itself changes no progress. O2 remains OPEN, Phase 3 remains `17/43`, and hosted wiring, real database proof, real two-viewer proof, Audit, Cherry acceptance, release, and `EXTERNAL_OUTCOME_COMPLETE` remain open.

## Operation ledger

- Product/code/test/runtime/API/UI/migration/existing-document mutations: 0.
- Tests, builds, dependency installs, Supabase CLI/provider/database/network operations: 0.
- Account/session/browser/device/private-store/credential operations: 0.
- Push/deploy/release/external-message operations: 0.
- Repository mutations in this slice: exactly this decision packet and its documentation-only preflight.

## ABANDON

**ABANDON:** this packet proves only that the material database-authority decision is explicit. It does not repair the failed migration, authorize source work or deployment, accept Option A on Cherry's behalf, close any Gate, or prove hosted/real-use safety.
