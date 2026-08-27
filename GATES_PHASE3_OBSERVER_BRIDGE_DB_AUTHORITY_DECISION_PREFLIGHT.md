# Gates · Phase 3 Observer Bridge DB Authority Decision Preflight

Status: **DECISION REQUIRED / H3-H4 CORRECTION LOCKED / NO SOURCE OR DEPLOY AUTHORITY**

These checks prove packet completeness only. Checked boxes are not implementation, contract adoption, progress, QA, Audit, acceptance, deployment, or O2 evidence.

- [x] D1 · Exact independent QA evidence pin and the mutable-GUC authority defect are preserved.
  CHECK: `rg -n "7ab8c7619872b03ebc16dafe2449dc75a7f3edb7|5f622360878ca15865d8ac871966b5fa508cd67e|current_setting|NOLOGIN|NOBYPASSRLS|cryptographic" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md`
  EXPECT: exact report commit/tree and plain-language explanation that role-controlled GUCs are not immutable authority.
  EVIDENCE: packet Decision boundary and The decision in plain language sections.

- [x] D2 · Four mutually exclusive paths are complete and no database guarantee is invented.
  CHECK: `rg -n "^### A|^### B|^### C|^### D|does not.*isolate|not proven|rejected" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md`
  EXPECT: A-D present; backend-compromise isolation is explicitly absent or unproven where applicable.
  EVIDENCE: packet Mutually exclusive options section.

- [x] D3 · Option A defines the exact trusted-backend boundary and residual risk.
  CHECK: `rg -n "Data API|dedicated bridge role|Every SQL statement|full compromise|residual risk|kill switch" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md`
  EXPECT: client isolation, server verification, least privilege, operations mitigations and compromise residual all present.
  EVIDENCE: packet Option A section.

- [x] D4 · Alternatives and all required comparison dimensions are decision-ready.
  CHECK: `rg -n "Protection from clients|Protection after backend compromise|Operational complexity|Supabase/Data API fit|Local testability|Time/cost|Current verdict|Recommendation" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md`
  EXPECT: one table row per required dimension plus explicit Option A recommendation.
  EVIDENCE: packet Decision table.

- [x] D5 · F2-F6 correction work remains independent of the selected authority model.
  CHECK: `rg -n "^### F2|^### F3|^### F4|^### F5|^### F6|manifest|opaque identifiers|UUIDv7|clock-skew|privacy residue" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md`
  EXPECT: operations-role SQL, manifest/tombstones, rollback identity, future time and retained-source fixes all specified.
  EVIDENCE: packet Corrections required regardless section.

- [x] D6 · Cherry approval leads only to additive planning, bounded correction and fresh QA.
  CHECK: `rg -n "If Cherry approves Option A|additive hosted architecture|new exact HEAD/tree|Fresh independent QA|No remote database application|17/43" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md`
  EXPECT: ordered next actions, new source pin, no remote mutation, and unchanged progress.
  EVIDENCE: packet If Cherry approves Option A section.

- [x] D7 · Non-authority and rollback boundary is explicit.
  CHECK: `rg -n "DECISION REQUIRED / H3-H4 CORRECTION LOCKED / NO SOURCE OR DEPLOY AUTHORITY|unapplied failed candidate|ABANDON|does not repair|O2 remains OPEN" docs/PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PACKET.md GATES_PHASE3_OBSERVER_BRIDGE_DB_AUTHORITY_DECISION_PREFLIGHT.md`
  EXPECT: both documents preserve correction lock, no source/deploy authority and no progress.
  EVIDENCE: packet status, boundary and ABANDON; this preflight status and disclaimer.

## ABANDON

**ABANDON:** D1-D7 prove documentation completeness only. They do not choose an option, amend an adopted contract, authorize H3-H4 correction, validate PostgreSQL/Supabase production behavior, close O2, change Phase 3 progress, or grant QA/Audit/Cherry acceptance/deploy/release authority.
