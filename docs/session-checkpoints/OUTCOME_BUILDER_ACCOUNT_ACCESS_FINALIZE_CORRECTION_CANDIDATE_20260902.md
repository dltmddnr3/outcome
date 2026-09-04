# OUTCOME Builder Account Access Finalize Correction Candidate — 2026-09-02

Status: `CANDIDATE_READY / BUILDER ONLY / FRESH QA AND AUDIT REQUIRED`

## Authority and pins

- Parent commit/tree: `0a05dd28ef728ee342a3d31fd4e784dceacb853a` / `577851d66672127ba05ea6e7b065fd207797fcca`.
- Builder binding and registry at start: `20/20`, schema/revision `2/132`.
- Safe-hold and Builder handoff carrier hashes: exact match.
- Local candidate only; no deployment, activation, QA, Audit, acceptance, O2 closure, Gate closure, Phase completion, or release authority.
- Browser, Clerk, Vercel, Supabase, database, environment, deployment, registry, and login-retry mutations: `0`.

## Correction

- Separates factor verification, transferable/incomplete sign-in state, session finalization, and navigation.
- Blocks transferable sign-in without initiating sign-up.
- Calls `finalize()` zero times for transferable or incomplete states and exactly once for complete states.
- Stages navigation until `finalize()` returns a null error.
- Returns distinct finite public-safe classes for verification, SSO, blocked-existing-account, incomplete, and session-activation failures.
- Preserves `transferable={false}`, popup-blocked/provider-unavailable behavior, owner verification, private read-only access, and concurrent-submission locks.
- Raw Clerk/provider errors and identity/session material projected or logged: `0`.

## RED and GREEN

- Exact-parent RED: `17` focused tests; `15` passed and `2` failed on ignored email finalization and conflated incomplete-state copy.
- Focused account-access component: `20/20`.
- Directly coupled account-access: `70/70` (`34/34` Node + `36/36` Vitest).
- Account-access static browser contract: `PASS`.
- Full repository: `539/539` (`103/103` Vitest + `436/436` Node).
- Production build: `PASS`; `1,654` modules transformed.
- Diff check and allowed-path boundary: `PASS`.

## Rollback and residual boundary

- Rollback: revert the single candidate commit.
- `false_completion_count: 0`.
- `external_mutation_count: 0`.
- Fresh independent UX & Product QA and fresh Release Audit are mandatory before any Preview deployment or login retry.
