# OUTCOME Phase 3 · Observer Bridge Canonical Integration · Fresh Independent QA

Terminal: `PASS_INDEPENDENT_QA_ONLY`

Observed: 2026-08-28 KST

## Immutable review identity

- reviewed carrier: `ab3dbac9c04e105328604f1ccc93b05183f9c56a`
- reviewed tree: `91a9b38cd93418c6ef27c9b252e28a365dd833d7`
- reviewed parent / integration merge: `3948b16301841e282acab945172e54f8c4fa7310`
- integration tree: `7b66728f4ae4f644fb1e451f12e348a4161c6c73`
- integration parents, ordered: `eb4bd0af15b57c6e5c96ff251173e29785fdc6c4`, `d6d4d66759faa29d3e2ead9a12b38a7ab9a19344`
- canonical session-binding source: `b8359691013501690a021709b974e463def6eea4`
- audited Observer Bridge carrier/tree: `d6d4d66759faa29d3e2ead9a12b38a7ab9a19344` / `49c49facb03f130ba48a7d69476bb5211321fa0b`

This QA used a fresh detached worktree created directly at the reviewed carrier. The canonical dirty worktree was observed but not modified. A temporary link to the already-installed canonical `node_modules` was used only for local test/build execution and removed before report creation. No dependency install, network call, provider operation, credential access, runtime activation, database operation, deployment, push, or other external mutation occurred.

## Bound evidence bytes

- integration Gate SHA-256: `2749b4dd7fcceb51ba54a3f71ebced8b6bc21003bdc873f8ba2f39395a7b02f0`
- Builder brief SHA-256: `c41a6f06e4e7c6c43ebcd66e6d181b71af99f9f70ccf40e13d696a267ecbe60a`
- Builder receipt SHA-256: `34cb3eec5bb9d9f1e05dfbbea83c79372e4819ff6c11b6ae6d4ecbed244092cb`
- trusted-runtime amendment Gate SHA-256: `f25a7703bcb62e7b2d896652c42d1c961428a3020bdf65895bdc0734a5f9c070`
- trusted-runtime amendment SHA-256: `71b6f3303e4a986a0f2bf4fffb6b1f2b67fec289b871e8061a2ae93d15104997`
- prior reachable-HTTP fresh QA report SHA-256: `ed95e919ce687aeb540cde54d453faaa8f07e94b319fec318a4339400cad4eac`
- prior reachable-HTTP Release Audit report SHA-256: `6e7d6f2c4253e634352115d7745f94c7bdd610bbaa60176ebbd5f8387c7988c6`

The prior session-binding V4 fresh QA and V6 Release Audit reports were read from their immutable report commits. They were treated as historical hypotheses; all current behavior below was re-executed against this carrier.

## Acceptance ledger

- [x] Q1: Carrier, merge, ordered parents, trees, ancestry, and evidence graph are exact.
  EVIDENCE: the carrier has the one exact parent above. `git merge-tree --write-tree` independently reproduced integration tree `7b66728f4ae4f644fb1e451f12e348a4161c6c73`; both input histories are ancestors; the unmerged index count is `0`.

- [x] Q2: Both lineages survived without integration-authored product drift.
  EVIDENCE: the merge changes `60` paths relative to its first parent and every non-carrier path traces to the audited Observer Bridge lineage. The carrier adds only the integration Gate and Builder receipt. The two session-binding source paths changed by `b835969` are byte-identical in the merge. Predicted and actual merge trees match, with no conflict resolution. Integration-authored product/dependency/migration/environment/secret/runtime paths: `0`.

- [x] Q3: Session-binding, Observer Bridge, and stable-host focused regression passes.
  EVIDENCE: session-binding `89/89 PASS`; Observer Bridge API/hosted/runtime/Postgres/operations/domain `101/101 PASS`; stable-host `34/34 PASS`; combined `224/224 PASS` across eleven focused files.

- [x] Q4: Full tests and production build pass.
  EVIDENCE: `npm test` frontend `90/90 PASS` across five files and Node `303/303 PASS`, combined configured assertions `393/393 PASS`. `npm run build` passed TypeScript and Vite with `1,652` modules transformed.

- [x] Q5: Reachable HTTP, authentication, default-off, no-store, one-call/no-retry, and read-only boundaries pass.
  EVIDENCE: the private bridge API/hosted/stable-host matrix passed `86/86`. It covered raw path aliases and invalid encoding, exact route/method admission, server-derived owner/viewer authority, Origin/CSRF, companion ambient-cookie/bearer removal, exact byte caps, malformed UTF-8, duplicate/forbidden JSON keys, private error branding, default-disabled capability flags, finite ordinary iterator failures, exact primitive-string/genuine-Buffer collection, private `no-store`, single invocation, zero automatic retry, and unsupported chunk rejection without coercion.

- [x] Q6: Security, public, mutation, scope, runbook, client-environment, and public-boundary checks pass.
  EVIDENCE: security `54/54 PASS`; stable snapshot prohibited disclosures `0` and Gate evidence fields `0`; public mode `4/4 PASS`; local mutations `32/32 = 405`; API mutations `28/28 = read_only`; empty-page boundary `0/4`; scope `51` product/runtime/test files; runbook `PASS`; API/HTML/bundle/rendered UI prohibited identifiers `0`; Vercel Git metadata leaks `0`; sealed Package payload leaks `0/6`; `git diff --check` passed.

- [x] Q7: Privacy, provenance, and mutation boundaries are preserved.
  EVIDENCE: the six merged non-test product modules contain added credential literals `0`, private-key literals `0`, connection URLs `0`, absolute local paths `0`, and email values `0`. Integration-authored non-evidence paths and absolute-path hits are both `0`. The imported immutable Gate/report evidence contains `10` local tool or ephemeral QA-worktree absolute-path occurrences; all are inherited from the audited second parent, are not runtime inputs or provider locators, and are not integration-authored.

- [x] Q8: Completion and release authority remain open.
  EVIDENCE: external mutations `0`; Supabase project/billing/database/driver/credential/environment/migration apply/provider/session/runtime/deploy/push/release operations `0`. O2 remains `OPEN/LOCKED`; Phase 3 remains `17/43`; fresh Release Audit and Cherry acceptance for this integrated carrier remain open; `EXTERNAL_OUTCOME_COMPLETE=false`.

## Independent findings

No QA-blocking defect was found in the exact integrated carrier. The merge preserved the current session-binding source bytes while importing the audited Observer Bridge lineage without a conflicting path or an integration-only product edit. The full and focused suites jointly exercise session registry reconciliation, persistence and redaction together with bridge domain, API, hosted adapter, runtime selection, Postgres, operations, and stable HTTP handling.

The trusted-runtime amendment is compatible with the merged implementation. Remotely controlled URL, method, header, auth, Origin/CSRF, body-byte, JSON, envelope, signature, nonce, sequence, timestamp, status, and database-port values remain strict hostile inputs. The Node/Vercel request machinery, platform async iterator, native Promise and JavaScript intrinsics, installed dependencies, and backend process remain trusted in-process surfaces at this stage.

## Residual risks and open work

1. A compromised Node/Vercel runtime, malicious installed dependency, monkey-patched intrinsic, substituted request machinery, arbitrary backend code execution, or dedicated backend credential compromise can violate the trusted process boundary. This QA makes no remote-reachability, trap-count, or isolation claim after that compromise.
2. Provider-specific hosted behavior, deployment provenance, dependency integrity, live traffic, Supabase transaction-pooler configuration, prepared-statement policy, real RLS, credential separation, migration, backup/restore, and operational rollback remain unexecuted and unaudited for this integrated carrier.
3. The local default-off candidate is not hosted activation, real two-location O2 evidence, Cherry acceptance, release readiness, or external completion.

## Verdict

`PASS_INDEPENDENT_QA_ONLY`

This verdict applies only to carrier `ab3dbac9c04e105328604f1ccc93b05183f9c56a`, tree `91a9b38cd93418c6ef27c9b252e28a365dd833d7`, and its exact merge ancestry. It returns this immutable carrier to a separate fresh Release Audit. It does not authorize Supabase provisioning, database or credential binding, runtime activation, O2 closure, Phase 3 advancement, Cherry acceptance, deployment, push, release, or external completion.

`quality_score=98/100`

`false_completion_count=0`

learning_receipt: A canonical merge is trustworthy only when its predicted tree, ordered parents, source-lineage provenance, independently remeasured focused/full suites, and threat/privacy boundaries all agree. Historical QA and Audit remain inputs, not substitutes for current-carrier execution.

## ABANDON

**ABANDON:** Fresh Release Audit, Cherry acceptance, Supabase provisioning or billing, database/driver/credential/environment binding, migration apply, hosted activation, O2 proof or closure, Phase 3 promotion, deployment, push, release, and `EXTERNAL_OUTCOME_COMPLETE` remain outside this QA authority and open.
