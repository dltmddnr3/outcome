# OUTCOME Model v2 selective-context local activation — Builder receipt

Status: `SELECTIVE_CONTEXT_LOCAL_ACTIVATION_CANDIDATE_READY_BUILDER_ONLY`

## Immutable candidate

- Accepted source / tree: `d726e200a9500658ae1fee5781d1d908a6b1a522` / `aac3b7109820b01e4c626a9fab3437acf5a3dc30`
- Accepted product candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`
- C1 acceptance receipt SHA-256: `602640f60d712e9f96155d0ba1c3c9cb1c9db942c24065b85c81c00e7a84d655`
- Selective-context implementation commit / tree / parent: `b26b5ad3435ac84ab1ddc3e86a346a06064d471d` / `6fe2505eb9d155ae930ad47c62f4d7d19e798421` / `d726e200a9500658ae1fee5781d1d908a6b1a522`
- Closed B1-B6 Gate SHA-256: `261f67b481b0f830973a6225012db9b938fe443caa49d1ab349ca8d4f8258a97`
- Changed paths: the selective-context Gate, `server/outcome-model-v2.mjs`, its test, and `scripts/outcome-model-v2-local-canary.mjs` only.

## RED → GREEN evidence

- RED: focused test import failed because the accepted carrier exported no `compileOutcomeSelectiveContextPlan`; the accepted canary therefore had no supported adapter consumption contract. Re-running the accepted carrier also exposed its stale service-Gate digest/frontier expectation.
- GREEN: the accepted snapshot digest is now the content-addressed `active-bootstrap-snapshot` of a schema-2, projection-only plan. The plan is consumed only when the local adapter advertises `content-addressed-plan-v1`; an unsupported adapter returns `safe_hold` before its callback.
- Default Builder load set: `AGENTS.md`, active snapshot, one current Gate, common skills, and one Builder skill. Current handoff is null. All four roles and no-role have deterministic positive controls.
- Unknown work, wrong role skill, missing input, source drift, unsupported capability, duplicate expansion and unrelated expansion are finite negative controls. Expansion requires reason, exact digest and matching work ID.
- Two final canary outputs were byte-identical at SHA-256 `66259e577b6c7366898cbc04d60eff75a60e0e3a730d04762345aa29ed54d3d3`.

## Verification

- Focused Model v2/control-plane: `53/53` PASS.
- Full server with isolated read-only dependency link: `394/394` PASS. The first dependency-free run failed at imports and one runtime timeout; the dependency-backed rerun passed all, including the runtime test.
- Frontend: `99/99` PASS.
- Account access: server `33/33` PASS; component/API `32/32` PASS.
- Production build: PASS, `1654` modules transformed.
- Browser assertion suite: `22/22` PASS. Current candidate browser fixture: PASS across contracted desktop, tablet, mobile and landscape viewports.
- Stable-host browser check: known non-candidate stable snapshot gap remains FAIL because its existing snapshot contains untranslated English, selection distinction and Gate-group mismatches. No stable snapshot path was authorized or changed.

## Safety and boundaries

- Canonical dirty fingerprint before and after: `9da25af29dfa63f90ec3f599e3fa529a1c453b0f058442257de38f36ac6a266f`; user-owned dirty state remained unchanged.
- Explicit `OUTCOME_MODEL_V2_ENABLED=0` preserves exact v1 object identity and serialized bytes.
- Task-owned dependency symlink was removed. No listener, persistent setting, provider, credential, data, shared environment, registry, role dispatch, session replacement, Preview, deployment, Production, release or Phase mutation occurred.
- Automatic retry/resend/replay: `0`; execution started: `0`; duplicate execution: `0`; unauthorized canonical transition: `0`; registry/provider/environment mutation: `0`; false completion: `0`.
- Rollback: stop using this detached candidate and return to exact accepted source `d726e200a9500658ae1fee5781d1d908a6b1a522`; explicit runtime compatibility rollback remains `OUTCOME_MODEL_V2_ENABLED=0`.

This is Builder candidate evidence only. It is not four-role operational activation, QA, Audit, Cherry acceptance, deployment, release or Phase transition.
