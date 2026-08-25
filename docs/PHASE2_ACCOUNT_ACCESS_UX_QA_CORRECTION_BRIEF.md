# Phase 2 · Account Access UX QA Correction Brief

Status: `BUILDER CORRECTION REQUIRED · FRESH RE-QA REQUIRED`

Source failure: `docs/PHASE2_ACCOUNT_ACCESS_FRESH_UX_PRODUCT_QA_2241782.md`

Owning task Gate: `GATES_PHASE2_ACCOUNT_ACCESS_UX_QA_CORRECTION.md` B1-B6

## Required outcome

Correct only `QA-ACC-001` through `QA-ACC-003`: render the two allowed project projections and inspectable hierarchy in ready private mode, make provider-neutral login/logout transitions genuinely exercisable without real OAuth, and remove mobile 200% zoom overflow. Preserve every public/security/data/browser boundary already proven.

## Allowed paths

- `src/OutcomeApp.tsx`, `src/lib/api.ts`, `src/components/AccountWorkspace.tsx`, `src/components/AccountWorkspace.test.tsx`, `src/styles.css`
- `server/account-access*.mjs`, `server/account-access*.test.mjs`, `server/index.mjs`, `server/index.test.mjs`
- `scripts/account-access-browser-check.mjs`
- `GATES_PHASE2_ACCOUNT_ACCESS_UX_QA_CORRECTION.md` evidence only
- new `docs/PHASE2_ACCOUNT_ACCESS_UX_QA_CORRECTION_EVIDENCE.md`

Everything else is read-only. Do not edit public Package/snapshot/map/contract, stable-browser assertions, migration/RLS, QA report or other project files.

## Acceptance

1. Ready response renders two project controls and `Project → Phase → Scope → Stage → Gate`; touched selection cannot change the actual current marker.
2. Login controls call only a synthetic/provider-neutral injected adapter in tests and expose loading/success/failure; they never imply real OAuth. Ready mode exposes a ≥44px logout control and verifies session-end transition.
3. MacBook 1440×900 and mobile 390×844/375×812 cover ready hierarchy, project switch, current-vs-selected, keyboard, touch, reduced motion, contrast and all prior states.
4. At 200% CSS zoom both mobile widths have zero page horizontal overflow, no hidden/truncated content and text remains ≥11px.
5. Public routes, disabled production private config, mutation 405, redaction, receipt, RLS and stable dashboard regressions remain unchanged.

## Handoff boundary

Return `CANDIDATE_READY_ONLY` or `BLOCKED`. Fresh independent re-QA must use a new reviewer pin. No deploy, provider/resource mutation, Release Audit, Cherry acceptance, release or Phase completion authority is granted.
