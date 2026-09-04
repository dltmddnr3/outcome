# OUTCOME Builder O2 Runtime TLS CA Correction Candidate — 2026-09-02

## Authority and scope

- Role: Builder only.
- Parent commit: `0f28df5ca733f624f3838d5b95efb45cfc1325c2`.
- Parent tree: `6a36ee9159b767e79f005867175e54f321da7a4a`.
- Local candidate only; no activation, deployment, acceptance, O2 closure, or Phase completion authority.
- Provider, browser, migration, SQL, environment, registry, and active-root mutations: 0.

## Candidate change

- Added the exact managed CA environment name `OUTCOME_OBSERVER_BRIDGE_V2_DATABASE_CA_PEM`.
- Requires one bounded canonical X.509 PEM certificate from an own data property.
- Rejects absent, malformed, duplicated, oversized, accessor-backed, and proxied CA carriers without executing caller behavior.
- Rejects connection-string TLS overrides and any process-level `NODE_TLS_REJECT_UNAUTHORIZED` carrier.
- Constructs the PostgreSQL pool with `ssl.ca` set to the validated private value and `ssl.rejectUnauthorized` fixed to `true`.
- Does not expose the CA or derived private material through public configuration.
- Preserves the default-off feature boundary, role/RLS transaction checks, timeouts, Preview origin, and finite error behavior.

## Verification

- RED on the exact parent after test-only change: 10 tests; 6 passed, 4 failed on the missing CA contract.
- Focused managed-runtime GREEN: 10/10.
- Coupled observer-bridge GREEN: 122/122.
- Full repository GREEN: 535/535 (99 Vitest + 436 Node tests).
- Production build: PASS; 1,654 modules transformed.
- Diff check: PASS.

## Rollback

- Revert the single local candidate commit. No provider-side rollback is required because provider mutations were 0.

## Residual boundary

- This receipt proves only the local candidate and test/build evidence.
- Fresh independent QA is required.
- A future activation attempt must separately verify the real provider CA carrier and managed runtime; this candidate does not authorize or prove either.
