# Stable Snapshot Unavailable Source Preservation Evidence

Status: `CANDIDATE READY · NO SNAPSHOT RECAPTURE · NO EXTERNAL MUTATION`

## Immutable boundary

- Base commit: `598a9d10c42b5ca2265500e64ad6c2cfb9c40f1c`
- Base tree: `b6db6be65b4f398e2895a8a1c12c943dc3dc2108`
- Candidate commit/tree and built asset are resolved from the final Git object containing this document and reported in the Builder handoff.
- The existing deployment source snapshot was not recaptured or committed. No external Package, account code, provider, resource, secret, environment, deployment or release mutation occurred.

## Red-first receipt

`node --test scripts/capture-stable-snapshot.test.mjs`

- RED after dependency availability: exit 1 because the pre-correction capture module did not export `buildStableSnapshot` and had no preservation boundary.
- GREEN: 5/5.

## Preserved invariants

- Preservation is index-bound and occurs only when current and prior project counts are equal, the current slot has status `unknown`, and the prior slot has a non-`unknown` status plus a non-`unknown` project ID.
- The entire prior public project slot is preserved, including its original `observedAt` and `sourceFreshness`. No new per-project freshness is inferred.
- A valid current slot always replaces its prior slot; the test proves current OUTCOME replaces the old OUTCOME projection while the unavailable first slot is preserved.
- Missing prior data, count drift, or a prior unknown slot keeps the current unknown projection unchanged.
- A source-verified non-unknown prior projection remains eligible even when its semantic status is `conflict`; this covers the current preserved Cherry Note source shape without converting that status to valid.
- `projectPublicPackages` runs after the merge. The focused adversarial fixture proves prohibited paths, credential fields and raw Gate evidence do not survive.

## Verification

- Focused capture preservation: 5/5 PASS.
- Package model: 39/39 PASS.
- Stable host: 8/8 PASS.
- Security: 28/28 PASS; stable snapshot projects 2, prohibited disclosures 0, Gate evidence fields 0.
- Full tests: frontend 66/66 and Node 104/104 PASS.
- Vercel build: PASS; source validation and finalized receipt tests 8/8.
- Stable browser: 2 projects across 1440×900, 390×844, 375×812 and 844×390 PASS; source groups 8/8, overflow/clipping/intersections/unexpected English 0.
- Public boundary: prohibited identifiers 0.

## Rollback and limitations

- Rollback is the inverse of the exact candidate commit. No data or external resource rollback is needed.
- This candidate does not repair the unavailable Cherry Note source, recapture the canonical snapshot, infer freshness, deploy, release or close any product Gate.
- A later authorized snapshot capture will apply preservation against the prior sanitized snapshot; this Builder run proves the merge contract without mutating that source file.
