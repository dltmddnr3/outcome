# OUTCOME Model v2 canonical package O1 projection closure — fresh QA receipt

Status: **SAFE_HOLD_UX_PRODUCT_QA_ONLY**

The immutable O1 projection-closure carrier passed its fresh isolated product, determinism, hostile-input, privacy, rollback and regression checks, but the required active-root dirty fingerprint did not match the handoff pin. This is a fail-closed QA hold, not promotion, dogfood, Gate closure, acceptance, activation, deployment, release or Phase completion.

## Immutable identity and scope

- QA input carrier/tree/parent: `0b1e6521eed534953c3481a5a027f2820e6e97dc` / `0d9efc3e9f9b32b333d55e6010c051588bbd6aff` / `ec8ec6e6cb820e4b2396d918d0736660ebd1a98a`.
- Handoff SHA-256: `04cd5c9b127fc7f61b0b689c4b2dba76201fee18988ba994a685644621a92417`.
- Semantic candidate changes exactly eight authorized paths; Builder carrier changes only its receipt path.
- QA used detached disposable worktrees. Active-root source, index, dirty paths, Contract/Map bytes and modes were not edited. Dogfood invocation count was `0`.

## Independent evidence

- RED-before-GREEN: exact active base plus only the truthful O1 Gate update reproduced two focused failures (`8 pass / 2 fail`), matching the Builder's `39/41` assertion boundary. The immutable closure carrier then passed the focused projection/canary suite (`10/10` tests; Builder assertion contract `41/41`).
- Projection truth: acceptance `8/8`, remaining `0`, ready frontier `[]`, active work `null`, next action `null`, Cherry action `null`; stale/conflict false, delivery unknown `0`; rollback available in `v1_compatible` mode with persistent-state change false; every safety counter `0`.
- Digests reproduced: Gate `92856644c48e0dbe8b77fc08b26fbb8acf288a5c45b80b3f4f815faceb9e3d27`; source manifest `116891317cc283aab7b55c7c141b4b716e7f18cad3d44c0b413cca8b6f00b92e`; projection `42a848598f330d60c3a4ca83f3f057dbe9648209d3176207e9fbeb82fd8439c0`; snapshot `8981ec71e586822b1f498e1f82e6539930a9841b88b36759db0dd42e34da7302`.
- Two clean generator runs produced byte-identical `2,118`-byte snapshots and left the carrier clean.
- Terminal default canary exited `2` with `cold_compile_required/o1_evidence_closed`; consumption, adapter callback, receipt, retry, duplicate, mutation and false-completion counts were all `0`.
- Hostile source drift, dirty overlays, missing/unresolvable HEAD, snapshot drift, missing fixture, object shape, Proxy/accessor, privacy serialization and rollback boundaries passed in the focused and full suites.
- Full server `411/411`, UI/library `99/99` across `7/7` files, and `git diff --check` passed.

## Blocking readback

- Required active-root pin: HEAD `46256105d8457e505de08094c5cd997fb731c053`, dirty manifest `396 / 94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`, staged entries `0`.
- Actual readback: HEAD matched and staged entries remained `0`; Contract/Map modes remained `0644`; dirty manifest was `410 / babd1c57d1bb1ae2e76b5762a8db149661f6a26f2f5d684b3195ba03f55c7d88`.
- The mismatch is a handoff stop condition. QA does not infer whether the additional dirty entries are benign or authorized and does not repair, delete, archive, promote or replay anything.

## Verdict

`SAFE_HOLD_UX_PRODUCT_QA_ONLY`

Decision owner: Planner/Cherry must provide a newly pinned dirty manifest or restore the exact authorized baseline before a fresh QA task can issue a PASS. Automatic retry, external mutation, dogfood replay, promotion and false completion counts are `0`.
