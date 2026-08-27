# Phase 3 Observer Bridge · Async Error Brand Correction Builder Receipt

Terminal: **BUILDER_ERROR_BRAND_CORRECTION_READY_ONLY**

## Immutable evidence graph

- source / re-QA FAIL carrier: `c63256a64799b5aa453e76a6d29cd9fc9d623fcf`
- source tree: `d8ffcc1441f4d592f9d1338dbd5fe09442559e01`
- source parent / prior Builder carrier: `53f33c6561d4d344153f23e653a6719c082f432c`
- re-QA FAIL report SHA-256: `206e9ab43b2b190e612d183dd7bb506f337d21f33685fc1453651c6cd3b623eb`
- prior correction receipt SHA-256: `774ae9dd0f5fe44b6f84cef0a8b9dcb09a978d8f514f234de6075aa2812a62c3`
- prior QA report SHA-256: `5b526c23c8768877b56b615256817499d6d7aaf5d3f1a945c6e9641aaf321cc7`
- prior Release Audit FAIL SHA-256: `8f4ac1d99420ddc8a73cacfda122b02051615c7fd2ce4ecafae1aaa655fa03c8`
- semantic correction: `219c33fa8905e18ab3ef1c9dec817eab3f79a78f`
- semantic tree: `4d2176af6593a08d33d75c68cd755c7ed466a28c`
- semantic parent: exact re-QA FAIL carrier above
- source/report drift: 0; prior QA, Audit, and re-QA report bytes unchanged

Changed paths, exactly seven:

- `server/phase3-observer-bridge-hosted.mjs`
- `server/phase3-observer-bridge-hosted.test.mjs`
- `server/phase3-observer-bridge-api.mjs`
- `server/phase3-observer-bridge-api.test.mjs`
- `server/stable-host.test.mjs`
- `GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION.md`
- `docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md`

`api/index.mjs` remains byte-identical to the source; its previously audited residual catch is retained.

## Correction

- `HostedObserverBridgeError` registers each genuine construction in a module-private WeakSet and records its original code in a module-private WeakMap. Neither identity store is exported.
- The exported classifier is total and returns a code only for a non-Proxy branded instance whose prototype is exactly `HostedObserverBridgeError.prototype`, whose own keys are exactly `stack`, `message`, `name`, and `code`, and whose descriptors are exact data descriptors with the original fixed known code.
- Native stack is materialized into a data descriptor during construction; throwing stack formatting is caught and produces an empty data stack without breaking error construction.
- Prototype spoof, branded prototype mutation, subclass, symbol/string decoration, code accessor/overwrite/delete, name/message/stack mutation, ordinary/revoked Proxy, cross-realm spoof, frozen/sealed instance, unknown genuine code, cycles, and reflection traps all classify as null and become generic `503 {error:"bridge_unavailable"}`.
- API classification uses only this exported classifier. Stable-host residual containment, one-call/no-retry, raw request/body, authorization, no-store, and default-disabled behavior remain unchanged.

## RED / GREEN evidence

RED before product edit:

```text
node --test --test-name-pattern='re-QA brand blocker' server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
tests 2; pass 0; fail 2
prototype-spoofed native Error and symbol-decorated genuine error both produced specific 429 responses.
```

GREEN measured matrix:

- exact re-QA blockers: 2/2 tests; 48/48 endpoint/layer/settlement combinations generic 503
- hostile brand authority: 18 classes x 6 endpoints x sync/async x API/stable = 432/432 generic 503
- genuine fixed mappings: 14 codes x 6 endpoints x sync/async x API/stable = 336/336 exact
- selected hostile operation calls: 432; retry 0
- hostile trap hits: 0; unhandled rejection events: 0; raw-detail disclosure: 0
- hosted classifier/mutation focused: 2/2
- hosted/API/stable full focused: 65/65

## Regression evidence

- bridge/hosted/account targeted: PASS, 128/128
- full Node: PASS, 249/249
- full frontend: PASS, 89/89 across 5 files
- build: PASS, TypeScript plus Vite, 1,652 modules
- security: PASS, 44/44; stable snapshot prohibited disclosures 0; client environment leaks 0
- public: PASS, 4/4
- mutation: PASS, local 32/32 exact 405; API `read_only` JSON 28/28; page boundary 0/4
- raw hostile path aliases and Vercel catch-all preservation: PASS
- scope: PASS, 47 product/runtime/test files
- runbook: PASS
- public boundary: PASS, prohibited identifiers 0
- `git diff --check`: PASS
- Gate checker: fixed by the final receipt carrier

security/public/mutation/scope/runbook/boundary/diff: PASS

## External mutation ledger and locked boundaries

- external mutations: 0
- Supabase/network/provider/account/project/billing/database/migration/credential/environment/browser/session: 0
- deploy/push/release/public message: 0
- O2: OPEN/LOCKED
- Phase 3: 17/43
- EXTERNAL_OUTCOME_COMPLETE=false

## Rollback

Revert the receipt carrier, then semantic correction `219c33fa8905e18ab3ef1c9dec817eab3f79a78f`. This returns exactly to re-QA FAIL carrier tree `d8ffcc1441f4d592f9d1338dbd5fe09442559e01`. External rollback is unnecessary because external mutations are zero.

## Accepted residual risk

- The exported error constructor allows trusted module consumers to create branded errors intentionally; the brand protects against structural forgery, not malicious execution already authorized to import and invoke server modules.
- Exact descriptor shape intentionally treats frozen/sealed/decorated/mutated genuine instances as ambiguous and maps them to generic 503.
- No timeout, cancellation, uncertain-completion reconciliation, database driver, managed parity, or hosted activation is added or claimed.
- A new fresh independent QA and separate fresh Release Audit remain mandatory.

## False completion controls

false_completion_count: 9

1. An unforgeable error brand is not persistence authority.
2. Generic containment is not successful database completion.
3. Builder tests are not fresh independent QA.
4. The previous QA PASS predates both corrections.
5. The previous Release Audit remains FAIL evidence.
6. The latest re-QA is FAIL evidence, not promotion.
7. One-call/no-retry does not define timeout or uncertain-completion policy.
8. O2 and Phase 3 progress remain unchanged and locked.
9. Local commits are not Cherry acceptance, hosted activation, deploy, push, release, or external completion.

## Learning receipt

learning_receipt: Exact prototype and descriptor checks are still forgeable structural identity. When a response classification grants more specific semantics, construction identity must be module-private and unforgeable; combine a WeakSet brand with the original semantic value and exact current shape, then let every mutation or ambiguity collapse to the generic finite response.
