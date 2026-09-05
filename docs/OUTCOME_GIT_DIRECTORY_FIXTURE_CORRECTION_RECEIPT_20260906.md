# Git-directory fixture correction — Builder receipt

Terminal: `OWNER_TESTS_PASSED_PACKAGING_PENDING`. This receipt is Builder evidence, not independent QA, Release Audit, Cherry acceptance, deployment, release, T1–T8 closure, or completion authority. `completionAuthority=false`.

## Authority and pins

- Existing milestone/predicate: `outcome-stage-phase4-timeline-status-read / AP-4-READ-STATUS / T1-T8`.
- Bounded handoff SHA-256: `9c8432aa438ace2dc463146776f9730f6d4d8b42f8db42b34dc59e129d7fdc5e`.
- Independent diagnosis SHA-256: `e0c8ff7984e56908145b8f4602497cb54884b82b32c20e2f343cafea08d18e84`.
- Exact base commit/tree/parent: `9a61506f9838041eb5f77dce4999ddf15b40bf83` / `32ab701c98227a65835d969ce823ac09e1589905` / `aae42568715baac57e1034d37d1568870aeb5c55`.
- Entry continuity: registry revision `163`, doctor clean, issues `0`, lock clear, current Builder/self/Planner `1/1/1`, Builder binding version `28`; exact app Builder/Planner `1/1`, unavailable hosts/sources `0/0`.

## Surgical correction

Only `server/outcome-current-projection.test.mjs:227` changed:

```js
rmSync(join(fixture, '.git'), { recursive: true, force: true })
```

The preimage test SHA-256 was `add222eb05c1647451ca08f9a9d621518cea9c3214e2103af7f6596d7f612b6b`; the corrected SHA-256 is `9223f5b8f8d1f4df451afbd72823ec37dd4ab42f27f56ae32ea742c62707af0e`. Git diff is exactly one insertion and one deletion. `rmSync` was already imported. The line-190 `unlinkSync(snapshot)` for a regular file remains, as do every original assertion and negative case. The removal target is the exact `.git` child of a test-owned `mkdtempSync` fixture populated by the immediately preceding recursive copy; no checkout or user-root `.git` is targeted.

## Isolated verification

Both roots were locally created from the exact base with no fetch or install and overlaid only with the corrected test file.

| Environment | `.git` type/mode | Command | Result |
|---|---|---|---|
| Full local clone | directory `0755` | `/usr/local/bin/node --test server/outcome-current-projection.test.mjs` | native exit `0`; `11/11`; stdout SHA-256 `b60fb8fd1ed49c13063a5dc4398b8dc5107973bf2f2960daa91ae7639fcf6f58`; stderr empty |
| Linked worktree | regular file `0644` | `/usr/local/bin/node --test server/outcome-current-projection.test.mjs` | native exit `0`; `11/11`; stdout SHA-256 `ae6a37677580dc7c4b3ed747179a8271f8d4d6a473e9481b7909d8222ec92908`; stderr empty |

Both runs executed the named `O1 default canary fails closed when its repository has no resolvable HEAD` case and preserved its exact `cold_compile_required / canonical_source_unavailable` assertions. Both also executed the snapshot whitespace/missing/symlink case, preserving the legitimate regular-file `unlinkSync` regression. Native-exit file SHA-256 was `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa` in both runs. Unexpected test failures `0`; test retries `0`.

## Precommit whitespace stop and bounded continuation

The first precommit `git diff --check` found only two Builder-authored Markdown trailing-space sequences at Gate lines 168–169. The Builder stopped immediately: no formatting repair, test rerun, staging, commit, or push occurred under the prior authority. Planner then read the exact stopped Gate and receipt and authorized only removal of those two trailing-space sequences, correction of this receipt's stale terminal, addition of this history and verification boundary, named diff-check, and one three-path candidate commit. This continuation is formatting/package evidence only; product-test bytes and results are protected at SHA-256 `9223f5b8f8d1f4df451afbd72823ec37dd4ab42f27f56ae32ea742c62707af0e` and were not rerun.

## NOT_RUN and preservation

`npm test`, build, security, scope, mutation, broad S8, package-model, provider/runtime/database/environment/deployment checks and independent QA/Audit are `NOT_RUN` in this bounded correction. The two completed owner test commands were not rerun during packaging. Prior independent QA's valid RED/GREEN/S1 evidence is not reclassified; its S2/S3/S8 fixture-construction results remain superseded only after fresh independent re-QA.

The original Builder worktree had clean tracked/index state plus eight unrelated untracked receipts. Their ordered mode/size/content manifest SHA-256 remained `e8ec4a3c1b3a835443c39f3d0bbaff05ae69b5f9d325b4299ddde284d3afa030` before this receipt. Canonical-root HEAD/tree remained `516dc6759ef77a774c7246e4495e56d6b8491580` / `c13324bd096427c149b7b1e6928628ac31a15141`; its raw status and tracked-diff SHA-256 remained `155a08864d5e379d45fdfb9e3ed56d38bedc622cbae5a33134330f4656053f1a` and `629baff31f6304cdbd780f64cd66722c5ade3ee87b9bf7749c3aab44a09efdcb` through verification. No permission, source, dependency, registry, provider, runtime, environment, database, deployment, alias or external mutation occurred.

Named candidate scope is exactly this test, the append-only Gate evidence, and this receipt. The containing commit/tree are intentionally reported by post-commit readback rather than self-referentially claimed here. Push count `0`; deployment count `0`; acceptance count `0`; automatic retry count `0`; false completion count `0`.
