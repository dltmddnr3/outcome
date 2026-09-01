# OUTCOME Model v2 canonical package O1 projection closure — corrected fresh QA receipt

Status: **PASS_UX_PRODUCT_QA_ONLY**

This receipt corrects only the active-root dirty-manifest measurement in the preserved SAFE_HOLD receipt. The immutable product QA evidence remains unchanged and valid. This PASS is bounded to fresh UX & Product QA of the exact O1 projection-closure carrier; it grants no promotion, dogfood replay, Gate closure, Release Audit, Cherry acceptance, activation, deployment, release or Phase completion authority.

## Immutable lineage

- Builder carrier/tree/parent: `0b1e6521eed534953c3481a5a027f2820e6e97dc` / `0d9efc3e9f9b32b333d55e6010c051588bbd6aff` / `ec8ec6e6cb820e4b2396d918d0736660ebd1a98a`.
- Preserved first QA carrier/tree/parent: `ef19080819a3ea7cfb22cafe4c53c19761d5dda3` / `014c76debb5b4e9c56b6433b4fdde3d94bc42145` / exact Builder carrier.
- Fresh QA handoff SHA-256: `04cd5c9b127fc7f61b0b689c4b2dba76201fee18988ba994a685644621a92417`.
- Semantic candidate changes exactly eight authorized paths; Builder carrier and both QA carriers are receipt-only descendants.

## Corrected active-root measurement

- The earlier SAFE_HOLD compared raw porcelain count/hash against a structured JSON-row manifest pin. Those are different measurement grammars.
- The corrected read-only algorithm collected the union of worktree, index and untracked paths; sorted paths lexically; emitted applicable `worktree`, `index`, `untracked` rows in that class order using file kind, Git mode and SHA-256 content digest, with staged `mode/blob/stage` entries for index rows; and hashed `JSON.stringify(rows)`.
- Exactly fourteen Planner-owned O1 handoff/rotation inputs were excluded. `docs/session-checkpoints/OUTCOME_MODEL_V2_O1_BOUND_ROLE_CANARY_20260901.md` was retained because it predates this work chain and is part of the established baseline.
- Independent readback reproduced exactly `396` rows / SHA-256 `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`; excluded inputs `14/14`; index rows `0`.
- Active-root HEAD remained `46256105d8457e505de08094c5cd997fb731c053`, staged entries `0`, and no product/root/registry/runtime/dogfood mutation occurred.

## Preserved QA evidence

- RED-before-GREEN: exact active base plus only the truthful O1 Gate update reproduced two focused failures (`8 pass / 2 fail`), matching the Builder assertion boundary `39/41`; the immutable closure carrier passed the focused contract `41/41`.
- Projection truth: acceptance `8/8`, remaining `0`, empty frontier, active work/next action/Cherry action all `null`; stale/conflict false, delivery unknown `0`; rollback available in `v1_compatible` mode; all safety counters `0`.
- Reproduced digests: Gate `92856644c48e0dbe8b77fc08b26fbb8acf288a5c45b80b3f4f815faceb9e3d27`; source manifest `116891317cc283aab7b55c7c141b4b716e7f18cad3d44c0b413cca8b6f00b92e`; projection `42a848598f330d60c3a4ca83f3f057dbe9648209d3176207e9fbeb82fd8439c0`; snapshot `8981ec71e586822b1f498e1f82e6539930a9841b88b36759db0dd42e34da7302`.
- Two clean generator runs produced byte-identical `2,118`-byte snapshots.
- Terminal default canary exited `2` with `cold_compile_required/o1_evidence_closed`; consumption, adapter callback, receipt, retry, duplicate, mutation and false-completion counts were `0`.
- Hostile source/ref/environment/object/path/type/fixture substitution, dirty-overlay, privacy and rollback boundaries passed.
- Focused/core `41/41`, full server `411/411`, UI/library `99/99` across `7/7` files, and `git diff --check` passed.

## Verdict

`PASS_UX_PRODUCT_QA_ONLY`

Dogfood invocation, active-root mutation, registry/provider/database/credential/environment mutation, Preview, Production, deployment, release, promotion, Phase transition, automatic retry and false completion counts are all `0`.
