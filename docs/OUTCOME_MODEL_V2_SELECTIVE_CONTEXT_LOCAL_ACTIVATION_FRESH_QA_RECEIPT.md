# OUTCOME Model v2 selective-context local activation · fresh independent QA receipt

Status: `FAIL_UX_PRODUCT_QA_ONLY`

This report-only carrier records fresh isolated read-only QA. It does not activate real roles, mutate product/Gate/registry/runtime/environment, replace sessions, deploy, release, accept or advance Phase.

## Immutable envelope

- Gate: `GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md`
- Handoff SHA-256: `de7405d88da720ffa590fd75c71be8a3d7ccb8bd169ca9f52c7d2ad1f97ab15a`
- Implementation candidate/tree/parent: `b26b5ad3435ac84ab1ddc3e86a346a06064d471d` / `6fe2505eb9d155ae930ad47c62f4d7d19e798421` / `d726e200a9500658ae1fee5781d1d908a6b1a522`
- Builder receipt carrier/tree/parent: `2f81090efb559c048467e716095d4f5fa8033683` / `5d694b659e4568d0490a2f6911ffecc61cc6abce` / `b26b5ad3435ac84ab1ddc3e86a346a06064d471d`
- Builder receipt SHA-256: `1c75901039d6b1f6d03e16a741f8083bc28c39acebd5fe74100fec840adb5712`
- Accepted source/C1 carrier: `d726e200a9500658ae1fee5781d1d908a6b1a522`

Protected preflight used private `locator_ref` without output: active `outcome / ux_product_qa` count `1`, exact self-match `1`, version/history `29/29`, registry revision `103`, doctor clean, issues `0`, lock clear; app inventory canonical-id match `1`. Canonical dirty state was preserved.

## Blocking finding

### F1 · P1 · Public adapter-consumption receipt leaks prohibited context references

Expected: no task/session/thread/turn identifier, private locator, local path, credential, raw prompt/result, provider payload or transition authority survives in a deterministic public-safe receipt.

Actual: fresh exact expansion probes reached a capable `content-addressed-plan-v1` adapter and returned `locally_consumed` receipts containing three prohibited synthetic source-ref classes verbatim: a thread-style private identifier, a private locator reference, and a provider payload reference. Tested classes `4`; survived `3`. The current `PRIVATE_CONTEXT_REF` only recognizes a narrow `thread_id`-like form and omits general locator/provider classes.

Impact: content-addressed selective-context receipts can serialize private routing/provider metadata. This directly violates B6 and the QA contract even though execution-start and canonical-transition authority remain zero.

Correction owner: Builder. Replace partial denial with an exact public source-ref grammar or comprehensive private classifier covering named task/thread/session/turn identifiers, locator/registry/provider payloads and local path families. Add compile, consume and serialized-receipt hostile tests with trap-free failure before adapter callback.

## Passing evidence

- Accepted source lacked `compileOutcomeSelectiveContextPlan`; candidate supplies a generated plan plus actual capability-bound adapter consumption receipt.
- Default unset configuration is Model v2; exact `OUTCOME_MODEL_V2_ENABLED=0` returns the v1 rollback contract without persistent/shared setting mutation.
- Planner, Builder, UX/Product QA, Release Audit and no-role mappings, minimal common/role skill loads, wrong-role, unknown work, missing input, source drift, unsupported capability and duplicate expansion controls passed in focused tests.
- Focused Model v2: `15/15 PASS`.
- Full server: `394/394 PASS`.
- Frontend: `99/99 PASS`.
- Account plus projection: `48/48 PASS`.
- Production build: PASS, `1,654` modules transformed, built in `744ms`.
- Browser assertions: `22/22 PASS`; current-candidate desktop/tablet/mobile geometry completed with overflow, clipping, intersection, reduced-motion and target checks green.
- Two deterministic canary outputs, execution/retry/replay/duplicate execution/persistent setting/registry/provider/environment mutation and false completion remain zero in the checked-in evidence.

## Stable-host classification

The stable-host browser check independently FAILed on untranslated English, current-selection distinction and source Gate-group mismatch. This is pre-existing and outside the candidate diff: the candidate changes only the new selective-context Gate, `server/outcome-model-v2.mjs`, its test and `scripts/outcome-model-v2-local-canary.mjs`; no stable snapshot or stable-host path changed. It is retained as an external product gap and is not waived, but it is not a candidate-caused regression.

## Counters, rollback and authority

- automatic resend/replay: `0`
- automatic/product retry: `0`
- execution started / duplicate execution / false completion: `0`
- product/test/Gate/canonical/registry/provider/runtime/shared-environment/dispatch/session/deploy/release/acceptance/push/external mutation: `0`
- real identifiers shared: `0`; hostile values were synthetic
- residue: `0` after dependency link, build output and disposable worktree cleanup
- rollback: stop using candidate `b26b5ad3435ac84ab1ddc3e86a346a06064d471d` and return to exact accepted source `d726e200a9500658ae1fee5781d1d908a6b1a522`; explicit compatibility rollback remains `OUTCOME_MODEL_V2_ENABLED=0`
- remaining authority: operational four-role canary, session replacement, Release Audit, Cherry acceptance, Preview/Production/deployment/release/Phase remain separate and unopened

## Verdict

`FAIL_UX_PRODUCT_QA_ONLY`

The next operational role-canary slice remains closed pending a corrected immutable candidate and fresh QA.
