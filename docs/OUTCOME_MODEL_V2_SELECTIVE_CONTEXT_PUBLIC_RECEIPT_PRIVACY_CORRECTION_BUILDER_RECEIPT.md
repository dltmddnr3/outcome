# OUTCOME Model v2 selective-context public receipt privacy correction — Builder receipt

Status: `SELECTIVE_CONTEXT_PUBLIC_RECEIPT_PRIVACY_CORRECTION_CANDIDATE_READY_BUILDER_ONLY`

## Immutable envelope

- Correction source / tree / parent: `78f089fbd9fd32b1b00bde43dd354e21a1d2ff0f` / `18df5a9eabdbac4ce820fb8e01bda4cdc38bfbf8` / `2f81090efb559c048467e716095d4f5fa8033683`
- Failed QA receipt SHA-256, preserved append-only: `d8c3d09e6295a99518dbfbdccdd10679b1eb8c6e169ec861d2d74adb839752cd`
- Correction commit / tree / parent: `02a7a66b64ff759da1082d111daa5082794f32e0` / `12b0e0736f1b87fd2672c9d960363c619a11af2a` / `78f089fbd9fd32b1b00bde43dd354e21a1d2ff0f`
- Corrected Gate SHA-256: `8e34bcc7487a7e210fb27a6d2a75e68157dfc8bbc47530969276090ff7ab38b8`
- Changed paths: the existing selective-context Gate, Model v2 module and test, and local canary only.

## RED → GREEN

- RED reproduced the failed-QA boundary: a thread-style source ref survived verbatim inside a `locally_consumed` public receipt, and the capable adapter callback executed.
- GREEN replaces the partial private-ref blacklist with exact positive sets for the current Gate, checkpoint aliases, approved documents and approved skills.
- Public loaded/skipped rows expose only finite `source_class` and `content_addressed` booleans. Internal source refs and source digests are not copied into the receipt.
- Hostile matrix: 23 task/session/thread/turn, registry/locator, provider payload, credential, raw prompt/result, POSIX, Windows, mixed separator/casing and markup variants. Compile survival `0`, callback survival `0`, serialized receipt survival `0`.
- Proxy/accessor trap execution: `0`; capable adapter callback for one valid plan: `1`.
- Default Model v2, exact v1 rollback, four role/no-role mappings, minimal load set, digest/reason/work expansion contract and prior finite holds remain covered.
- Two corrected canary outputs are byte-identical at SHA-256 `510ab410c4fb4487f033e5cfd62a3d62ef6a2024e9cd090385032ccf624fec85`.

## Regression evidence

- Focused Model v2/control-plane: `55/55` PASS.
- Full server with isolated dependency link: `396/396` PASS.
- Frontend: `99/99` PASS.
- Account access: server `33/33` PASS; component/API `32/32` PASS.
- Production build: PASS, `1654` modules transformed.
- Browser assertions: `22/22` PASS; current-candidate desktop, tablet, mobile and landscape browser fixture PASS.
- The failed-QA stable-host snapshot gap remains separately recorded and unchanged. No stable-host or snapshot path was authorized, tested as corrected, or modified.

## Safety, rollback and remaining authority

- Canonical dirty fingerprint before and after: `2b98c60aa3bb37020b67a058b28a17de1dce9c8e964479ba8caa00986a61f266`.
- Task-owned dependency link was removed; failed QA receipt remained byte-identical.
- Automatic resend/replay/retry, execution start, duplicate execution, registry/provider/runtime/shared-environment mutation, canonical transition and false completion: `0`.
- No role dispatch, session replacement, stable-host repair, Preview, deployment, Production, release, Phase transition, push, QA, Audit or acceptance occurred.
- Rollback: stop using correction commit `02a7a66b64ff759da1082d111daa5082794f32e0` and return to failed-QA source `78f089fbd9fd32b1b00bde43dd354e21a1d2ff0f`; explicit compatibility rollback remains `OUTCOME_MODEL_V2_ENABLED=0`.
- Fresh independent re-QA is mandatory. This Builder candidate is not a QA PASS, Audit PASS, activation, Cherry acceptance, deployment, release or Phase transition.
