# OUTCOME Role Transport Clock Authority · Fresh UX & Product QA V2 Receipt

Verdict: `PASS_UX_PRODUCT_QA_ONLY`

## Immutable candidate

- candidate commit/tree: `8aada70211cd514e0869f5cffb4ad310ec11f107` / `11cde5f90055250ca3eea749742a6906fbc300f8`
- Builder receipt carrier commit/tree: `c2c4d12366050289b5a98173f5994f2fde76fdf2` / `e1d391ba6bfad1f66b1b4bbbf75271fb532aaf46`
- Builder receipt SHA-256: `247b2029bcb31084d4bb79f500f9dc277ee519f9adb7d83f50a6b9f5d59aaaa5`
- governing Builder Gate SHA-256: `f2afd6c7ab53cc47ea77cb92a37a2f5601274b113a8912b7aa48f4adfc939cf1`
- prior blocker receipt SHA-256: `8285b4d42534416e314f574c906a1fdf2ce1bdda3688893f8e3e4130e7bbf054`

## Independent result

- An expired but otherwise valid signed receipt remains expired when the caller supplies a backdated control-plane clock, patches `Date.now`, replaces global `Date`, or attempts verifier construction through an object, function, Proxy, inherited wrapper, or method wrapper. It fails with `trusted_evidence_stale` before event allocation; event count is `0`.
- A fresh correctly signed and fully correlated receipt succeeds and allocates exactly one start event.
- Caller-generated Ed25519 authority, signature/payload tamper, wrong project/role/binding/public alias/destination/instruction/attempt/receipt/cursor/observation kind, duplicate, stale, and replay inputs fail closed.
- Production exposes verification with the pinned public key only. Production issuer/private/signing-key hits are `0`; synthetic signing keys remain in QA test code only.

## Measured evidence

- focused hostile plus candidate evidence/control-plane suites: `46/46 PASS`
- frontend: `90/90 PASS`
- complete/exhaustive Node: `349/349 PASS`
- security: `54/54 PASS`
- stable snapshot: prohibited disclosures `0`, Gate evidence fields `0`
- public boundary: API/HTML/bundle/rendered UI prohibited identifiers `0`
- client environment: Vercel Git metadata leaks `0`, sealed Package payload leaks `0/6`
- scope: `58` files PASS
- runbook: PASS
- production build: `1,652` modules transformed, PASS
- source-to-candidate diff and QA diff: `git diff --check` PASS

## Narrow authority

- Builder candidate/product mutation by QA: `0`
- registry/runtime/provider/environment/deploy/push mutation: `0`
- automatic retry and predecessor archive/delete: `0`
- Release Audit, Cherry acceptance, deployment, release, and Phase progress: open and not claimed

This receipt proves only fresh independent UX & Product QA of the exact candidate. It transfers no later authority.
