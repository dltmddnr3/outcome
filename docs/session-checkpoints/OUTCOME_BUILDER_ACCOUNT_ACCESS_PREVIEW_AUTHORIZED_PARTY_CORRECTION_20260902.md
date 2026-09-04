# OUTCOME Builder Account Access Preview Authorized-Party Correction — 2026-09-02

Status: `CANDIDATE_READY / BUILDER ONLY / FRESH QA AND RELEASE AUDIT REQUIRED`

## Authority and immutable input

- Parent commit/tree/parent: `dc4ca5bc9d4cf9d78fd85bee4616bb79a6bd39ad` / `5443bd1142bad239f21cfbcddf98f2dd4fc23a08` / `88d8167f2b356830f74ea9987c4343a333634dc1`.
- Gate SHA-256: `8066f47d598b0ab69090307440d056fc0dd48e3ae4994f8a9e7a07a3d904ef68`.
- Builder handoff SHA-256: `3957fbb1d9e4146a0408cf449cf2c96e2a1cac9a4ffa55abed680119704b6d32`.
- Diagnosis receipt SHA-256: `c05e44536ca35a0b2664c92ed3c93d18b9120386eaaff1675e8b3a12eaccccab`.
- The candidate identity is the enclosing Git commit. Fresh QA must independently pin its exact commit, tree, and parent before validation.
- Protected OUTCOME Builder continuity was singular; the isolated checkout was clean before mutation.

## Changed scope

- `api/index.mjs`
- `server/stable-host.test.mjs`
- this receipt

The account identity runtime now selects the existing strictly validated deployment-owned Preview origin independently of optional observer-bridge enablement. Exact Production, Development, and environments without provider classification preserve the configured stable origin. Invalid Preview metadata, unexpected classification, accessors, and Proxies fail closed before runtime construction.

No request `Host`, forwarded header, request origin, wildcard, custom-domain inference, or client input contributes authority. Official signature, issuer, exact authorized-party, expiry, issued-at, active-session/revocation, and owner-subject checks are unchanged.

## RED before GREEN

- Exact-parent RED: the new bridge-disabled Preview regression failed `0/1` because the identity runtime received no deployment-owned origin.
- Focused GREEN: `3/3`, covering bridge-disabled Preview selection, sole verifier authorized party, stable environments, forged request authority, malformed metadata, accessor, Proxy, and fail-closed runtime construction.

## Verification

- Directly coupled suites: `57/57` PASS across stable host, strict managed Preview-origin parsing, and account identity runtime verification.
- Full repository suite: `542/542` PASS — Vitest `103/103`, Node `439/439`.
- Production build: PASS — TypeScript and Vite, `1,654` modules transformed.
- Security boundary suite: `60/60` PASS; prohibited stable-snapshot disclosures `0`; client metadata leaks `0`; sealed Package payload leaks `0/6`.
- `git diff --check`: PASS.
- Allowlist diff: exactly the two source/test paths above plus this receipt.

## Boundaries and rollback

- Provider, browser, Clerk, environment, secret, policy, database, migration, registry, deployment, alias, Production, participant, billing, active-root, login, QA, audit, acceptance, and release mutations: `0`.
- Automatic retry: `0`.
- Private disclosure: `0`.
- `false_completion_count: 0`.
- `external_mutation_count: 0`.
- Rollback is one Git revert of the exact enclosing candidate commit, restoring parent `dc4ca5bc9d4cf9d78fd85bee4616bb79a6bd39ad`.
- This is an immutable local candidate only. It does not authorize QA PASS, Release Audit PASS, deployment, login retry, acceptance, O2 observation or closure, Phase closure, or release.
