# OUTCOME Phase 3 · Observer Bridge Fresh Independent QA

Status: **FAIL / FRESH INDEPENDENT QA / LOCAL SYNTHETIC ONLY**

Observed: 2026-08-27 KST

## Immutable candidate verification

- candidate commit: `b8c6c4feacfa84f040213940adafe953f08bd2e2`
- candidate tree: `2e44d741d933d4bd99eca762cd4d45294e2c0037`
- parent: `300d48bfc8af321bf92182a144178859596ef962`
- subject: `feat: add synthetic observer bridge ledger`
- candidate changed paths, exactly three:
  - `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_RECEIPT.md`
  - `server/phase3-observer-bridge.mjs`
  - `server/phase3-observer-bridge.test.mjs`
- implementation SHA-256: `2240ca3a88f989c5ca4265b061582da49cacc9f33e82be7704fc8b9a2ff3f42b`
- focused-test SHA-256: `78a3c63dcdc2fa53169a3d847c897fa79c8e1cbe42f23c489eb68dbef6d4e402`
- Builder-receipt SHA-256: `ec773c5fa854188fc2e7ff46cfdb1e4d822f5497db442b4484a8c3462af63865`

The candidate was checked out detached in a fresh temporary worktree. The Builder receipt was treated as a claim, not acceptance evidence. The contract amendment, architecture, Builder brief, receipt, implementation, and focused tests were read directly before testing.

## Verdict

`FAIL`

The candidate's existing focused and proportional regression suites pass, but two independently reproduced HIGH contract violations remain. The synthetic candidate is not eligible for promotion to hosted work until a new immutable Builder correction candidate passes fresh independent QA.

## Finding F1 · injected response clone can substitute prohibited output and still commit

- severity: **HIGH**
- contract: architecture ingest order steps 9–10 require a public-safe response clone followed by one atomic publish or no publish; public responses must omit signature/private fields and progress/completion authority.
- implementation boundary: `server/phase3-observer-bridge.mjs:255-260` accepts any non-null, non-Proxy object returned by injected `clone`; `server/phase3-observer-bridge.mjs:276-280` then publishes the draft and returns that substituted object.
- exact reproduction:

```js
let poison = true
const bridge = createPhase3ObserverBridge({
  ...validOptions,
  clone: (value) => poison
    ? { ...value, signature: 'private-signature', progress: 100 }
    : structuredClone(value),
})
bridge.ingest(validSignedEvent)
```

- expected: `materialization_failed`; no response disclosure; ledger revision remains `0`.
- actual: `{status:'accepted', ledger_revision:1, signature:'private-signature', progress:100}`; a subsequent authorized read reports ledger revision `1`.
- measured prohibited output hits: `2` distinct prohibited fields (`signature`, `progress`) in the adversarial response. Normal successful response/audit serialization had `0` prohibited sentinel hits.
- impact: a hostile or defective clone dependency can alter the public contract, disclose private-shaped data, manufacture progress authority, and commit state despite response materialization no longer being a faithful clone. This contradicts privacy-minimal output and atomic failure requirements.
- Builder correction boundary: validate that clone output is an exact deep-independent materialization of the drafted allowlisted response, including exact own enumerable data descriptors, keys, primitive values, array shape, and no accessors/Proxy; reject any substitution with `materialization_failed` before state publication. Add a RED test that injects extra, missing, changed, accessor-bearing, Proxy-nested, and prohibited response data and proves deep-equal state plus revision/ID continuity.

## Finding F2 · nested public-key Proxy executes traps and is accepted

- severity: **HIGH**
- contract: plain/hostile materialization must reject nested Proxy/trap-dependent values before caller-controlled evaluation; the Builder brief explicitly requires configuration and lifecycle nested Proxy reentry coverage with trap hits `0`.
- implementation boundary: `server/phase3-observer-bridge.mjs:130-132` reads `type` and `asymmetricKeyType` without first rejecting a Proxy; construction reaches this through lines `137-142`, and rotation reaches it through lines `498-506`.
- exact reproduction:

```js
let hits = 0
const proxiedKey = new Proxy(validEd25519PublicKey, {
  get(target, property) {
    hits += 1
    return Reflect.get(target, property, target)
  },
})
```

1. Using `proxiedKey` as constructor `source.public_key` was accepted and executed `2` getter traps.
2. Using `proxiedKey` as `rotateKey.new_public_key` was accepted, executed `6` getter traps, returned `key_rotated`, and consumed ledger revision `1` plus registry revision `2`.

- expected: finite `configuration_invalid` at construction or `input_invalid` at rotation, trap hits `0`, ledger/registry/ID state unchanged.
- actual: both Proxy keys were accepted; combined trap hits were `8`; rotation mutated state and consumed revisions.
- impact: caller-controlled nested evaluation and reentry is possible at the key boundary, undermining descriptor-first materialization, finite-error control, and atomic no-ID-consumption guarantees. The existing lifecycle Proxy test covers only the outer envelope and misses the nested key.
- Builder correction boundary: reject `isProxy(public_key)` and `isProxy(new_public_key)` before `instanceof`, property reads, `equals`, or crypto use; then validate exact public Ed25519 `KeyObject`. Add constructor and rotation RED tests whose Proxy traps attempt nested mutation and whose expected trap/revision/ID counts are all `0`.

## Independent negative coverage and measured results

### Independent external probe

- result: `7/10 PASS`, `3/10 FAIL`.
- the three failed assertions are the two findings above: one clone-substitution case and two public-key Proxy contexts.
- independently passing probe groups:
  - symbol and non-enumerable event keys reject atomically;
  - wrong project/role/binding/source/source-version/key-version share one `scope_denied` class;
  - RSA key-type confusion and noncanonical/padded/malformed signatures reject;
  - one-shot clock read and exact expiry boundary behavior;
  - viewer class alone, wrong private viewer and class mismatch deny;
  - exact duplicate, lower sequence, gap quarantine and post-quarantine replay preserve measured counts/revisions;
  - normal response/read/audit serialization has prohibited sentinel hits `0`.

### Candidate focused suite

- `node --test server/phase3-observer-bridge.test.mjs`: `13/13 PASS`.
- covered by direct inspection plus execution: strict own-data/missing/unknown/accessor/outer-Proxy/boxed/Symbol/BigInt/NaN/infinity/unsafe-value rejection; fixed-order length-prefixed UTF-8 canonical bytes; exact six-state vocabulary; canonical ISO/base64url and 64-byte Ed25519 signature; all `11/11` signed fields tampered; wrong scope/version/key; duplicate/conflict/lower/gap/resync; future/stale/expiry and backwards/nonfinite/out-of-range clock; two authorized viewer classes with identical projection; revoke/rotate/disable/restore/tombstone; throw paths for clock/verify/digest/clone and dependency reentry; public projection/audit authority redaction.
- coverage limitation proven by F1/F2: throwing clone was tested, but clone substitution was not; outer lifecycle Proxy was tested, but nested public-key Proxy was not.

### Proportional regressions

| Check | Result |
| --- | --- |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local mutation `32/32 = 405`; API read-only JSON `28/28`; empty page boundary `0/4` |
| `npm run test:security` | `29/29 PASS`; stable prohibited disclosures `0`; Gate evidence fields `0`; client-env sealed payload leaks `0/6` |
| `npm test` | frontend `89/89 PASS`; server Node `157/157 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `185/185 PASS` |
| `npm run build` | `1652` modules transformed; PASS |
| `npm run check:scope` | `37` files; PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

No dependency was installed. Existing canonical workspace dependencies were used read-only through a temporary symlink in the isolated worktree, and the symlink was removed before report creation.

## Privacy and operation counts

- normal successful public/projection/audit prohibited sentinel hits: `0`
- adversarial clone response prohibited field hits: `2` (`signature`, `progress`)
- nested public-key Proxy trap executions: constructor `2`, rotation `6`, total `8`
- source/key/signature/event/digest/viewer/raw timestamp/provider/session/thread/path/credential/free-text values in normal serialized public outputs: `0`
- progress/Gate/approval/completion authority fields in normal serialized public outputs: `0`
- provider-native introspection calls/imports: `0`
- provider/session/thread/turn read/list/resume/mutation operations: `0`
- prompt/result/chat/message/dispatch operations: `0`
- real account, hosted auth, browser, real device, private-store or credential operations: `0`
- network, HTTP listener, companion process, dependency install, push, deploy, release or external message operations: `0`
- static forbidden filesystem/network/HTTP/child-process call/import matches in the candidate module and focused test: `0`

## Authority and open-state boundary

This review covers only the local in-memory synthetic candidate. It is not provider-native introspection and is not hosted/account-authenticated or real-device evidence.

- O2: `OPEN/LOCKED`
- Phase 3: `17/43` unchanged
- hosted adapter/runtime: open and unauthorized
- account authentication: open and unauthorized
- real `workstation` and `remote_device` viewers: open
- real routing and Planner Routing T1–T7: open
- Evidence Continuity E1–E6: open
- separate Release Audit: open
- Cherry acceptance: open
- release/deploy/external completion: open
- `EXTERNAL_OUTCOME_COMPLETE=false`

No Gate, Map, Contract, progress, runtime, provider, external resource, or canonical checkout was edited or closed. Planner must route this FAIL to Builder; this QA report does not implement the correction or integrate itself into canonical.
