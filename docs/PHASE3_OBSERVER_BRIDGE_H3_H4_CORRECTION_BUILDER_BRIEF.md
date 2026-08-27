# Phase 3 Observer Bridge · H3-H4 Option A Correction Builder Brief

Status: **BUILDER HANDOFF READY / LOCAL ONLY / REMOTE AND O2 LOCKED**

## Authorization source

- source commit: `7ab8c7619872b03ebc16dafe2449dc75a7f3edb7`
- source tree: `5f622360878ca15865d8ac871966b5fa508cd67e`
- failed semantic candidate: `b0aef3a1af681c554d7c898e0e1d44a54466a456`
- authority amendment: `docs/PHASE3_OBSERVER_BRIDGE_OPTION_A_AUTHORITY_AMENDMENT.md`
- failed QA evidence: `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_FRESH_QA_B0AEF3A.md`

The execution authorization is the post-amendment Planner commit/tree supplied with the private dispatch. If any named file, hash, source identity or allowed path differs, return `SAFE_HOLD_SOURCE_DRIFT` with zero mutation.

## Objective

Produce one disabled-by-default local correction candidate that replaces the failed mutable-GUC authority design with the approved trusted private backend boundary and closes the independent F2-F6 findings through executable evidence. The candidate must remain undeployed and must not change O2 or Phase 3 progress.

## Exact allowed paths

- `supabase/migrations/20260827000756_observer_bridge.sql`
- `server/phase3-observer-bridge-postgres.mjs`
- `server/phase3-observer-bridge-postgres.test.mjs`
- `server/phase3-observer-bridge-operations.mjs`
- `server/phase3-observer-bridge-operations.test.mjs`
- `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md`
- `docs/PHASE3_OBSERVER_BRIDGE_OPTION_A_AUTHORITY_AMENDMENT.md`
- `docs/PHASE3_OBSERVER_BRIDGE_H3_H4_CORRECTION_BUILDER_BRIEF.md`
- `GATES_PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_CORRECTION.md`

No other path is authorized. A necessary adjacent change returns `SAFE_HOLD_SCOPE_EXPANSION` rather than widening scope.

## Required RED-first work

Before each correction, record a focused test that fails on the failed candidate and passes only after the correction:

- mutable GUC scope substitution and effective-role forced-RLS allow/deny;
- exact grants/policies for all operations SQL paths;
- missing/conflicting/stale/incomplete manifest and tombstone coverage;
- opaque identity and failed-transaction non-observability without contiguity claims;
- future skew below/at/above the exact boundary;
- deletion residue and restore raw-resurrection denial.

Tests must use declared effective roles, not only a database owner. PostgreSQL/RLS claims require actual local PostgreSQL-compatible execution of the exact migration. If unavailable, return `BLOCKED_POSTGRES_RLS_PROOF`; static inspection cannot close H3.

## Acceptance

- dedicated bridge backend is narrow, server-only, `NOLOGIN`, `NOBYPASSRLS`, not Data API/client/service-role authority;
- anonymous has no schema/table access;
- authenticated viewers have exact owner-authorized read projection only;
- bridge backend writes are explicitly scoped in every statement and constrained by composite relationships, CAS and append-only rules;
- no policy depends on client/session-mutable custom GUC values as authority;
- F2-F6 are each demonstrated by RED/GREEN and hostile denial evidence;
- feature-off, public GET, public `405 read_only`, privacy scans, package, security, full Node/frontend and build regressions pass without weakening tests;
- receipt records exact source/candidate/parent/tree, migration hash, changed paths, commands/counts, real effective-role operations, prohibited hits, rollback, residual risk and zero external operations;
- terminal status is `HOSTED_CODE_CANDIDATE_READY_ONLY` or an exact `BLOCKED`/`SAFE_HOLD` reason.

## Forbidden actions

No remote Supabase/database apply, provider/account/project creation, credential or environment mutation, network call, browser/device/session operation, hosted wiring, deploy, push, release, public message or real data. Do not edit Contract, Map, current progress, existing unrelated Gates or `docs/ROADMAP 2.md`. Do not self-QA, self-audit, self-accept or claim O2/progress.

## Rollback

Rollback is Git-only for the local candidate: revert the correction candidate and its receipt carrier. No migration has been remotely applied, no event is replayed, and no environment or provider resource is changed.

## ABANDON

**ABANDON:** Builder PASS is a local candidate claim only. It does not constitute UX & Product QA, Release Audit, Cherry acceptance, hosted safety, O2 proof, progress, release, or external completion.
