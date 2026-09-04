# OUTCOME Builder Non-Git Preview Provenance Candidate Receipt — 2026-09-02

Status: `BUILDER CANDIDATE ONLY / FRESH INDEPENDENT QA AND RELEASE AUDIT REQUIRED`

## Immutable input and scope

- Handoff SHA-256: `1e023673db3bece131e39fbf0eea98c8bf2816a18228ea08ebf5be9dbf952449`.
- Exact parent/tree/parent: `2499a4b8b0a4ed87c1fe96d7230df92a9c94cf66` / `f53d5b98b79842aece3808961d63c12002d9b768` / `0a05dd28ef728ee342a3d31fd4e784dceacb853a`.
- Attempt-4 rollback receipt SHA-256: `444d224df2e88371cb0f778a008926827c857468abef16abfdf67d648879e97c`.
- Changed scope is limited to the approved generator, validator, finalizer, directly coupled tests, `package.json`, and this receipt.

## RED

- A source-only exact-parent archive with provider Git SHA absent and no `.git` exited nonzero at the finalizer with `deployment commit is required`.
- Exact-parent authenticated build-only carrier/generator/validator path count: `0`.

## Builder GREEN evidence

- Deterministic carrier and hostile provenance matrix: `26/26 PASS`.
- Full repository suite: Vitest `103/103 PASS`; Node `436/436 PASS`.
- Security/public boundary: `57/57 PASS`; prohibited client environment leakage `0`.
- Account access: Node `34/34 PASS`; Vitest `36/36 PASS`.
- Managed runtime and TLS/CA boundary: `10/10 PASS`.
- Ordinary production build: `PASS`.
- Source-only non-Git `build:vercel`: validation mode `carrier`; stable-host `37/37 PASS`.
- Source-only served receipt pinned the exact immutable candidate commit/tree and built asset.
- Carrier/private validation-receipt terms in `dist` and the generated API snapshot: `0`.
- Prohibited local-path/carrier/private-receipt disclosure count in public output: `0`.

## Failure and authority boundary

- Missing, extra, reordered, duplicate, omitted, traversal, absolute, control-character, decorated JSON shape, wrong type/version/count/size/mode/hash/commit/tree/digest, modified-file, symlink, stale-receipt, and contradictory Git evidence cases fail closed.
- Automatic repair/retry: `0/0`.
- Provider, deployment, environment, Production, alias, project-setting, Supabase, database, registry, account, Git-provider, and authentication mutations: `0`.
- `false_completion_count: 0`.
- The candidate does not authorize deployment, acceptance, promotion, release, O2 closure, Gate closure, or Phase completion.

## Rollout and rollback

- Rollout remains disabled pending fresh independent Lime QA and fresh Release Audit of the exact candidate commit.
- Rollback is one Git revert of the exact candidate commit; the parent remains immutable and directly recoverable.
