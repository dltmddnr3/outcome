# OUTCOME Phase 3 · Observation Structural Policy Correction Receipt

상태: `CORRECTION_CANDIDATE_READY_ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

## Source and implementation receipt

- fresh re-QA head: `d0c4858bf7b75cd613ee7ed44669269cbd403916`
- fresh re-QA tree: `a4653ccceb5aa607976af632788ee20ad8bc53e9`
- implementation commit: `2d0134da1e243e9302bd6eb6a7d7d3988dddfab4`
- implementation tree: `d7b181a0167c1e4cc2182234766554a1a2a095a9`
- implementation parent: `d0c4858bf7b75cd613ee7ed44669269cbd403916`

## Implementation changed paths

- `server/phase3-observation-relay.mjs`
- `server/phase3-observation-relay.test.mjs`

이 문서는 별도 receipt-only commit이다.

## RED → GREEN

- RED: focused 14/16 PASS. Exact F5 17-case set과 F6 canonical 321 boundary가 각각 실패했다.
- final focused GREEN: 16/16 PASS.
- F5: 17/17 synthetic delimiter, malformed escape and non-HTTPS scheme values reject as `summary_prohibited`; deep-equal state, raw hit 0, next evidence ID `[1]`.
- F6: canonical length 320 accepts and preserves the exact original; 321 and U+FDFA 20 repetitions reject without consuming evidence.
- exact prior 12 canonicalization negatives, exact 10 positive controls, relative paths, public HTTPS, literal percentage and benign fullwidth prose remain passing with accepted originals unchanged.

## Structural policy

- Validation-copy NFKC length is checked immediately and after each of at most two percent-decode passes.
- Complete percent encodings decode within the bound; malformed/incomplete escape attempts and remaining encoded triplets fail closed. Literal prose percentages followed by whitespace or end remain valid.
- A defined punctuation, slash, colon, middle-dot, pipe and whitespace class is normalized only for semantic label inspection.
- session/thread identifiers or tokens, provider locators, API/private/secret keys, credentials and prompt/result raw labels followed by values are rejected structurally.
- URI-like prefixes allow only explicit `https://`; other scheme-like forms fail closed.

## Full regression

- `npm run test:package-model`: 39/39 PASS.
- `npm run check:mutations`: 32/32 status 405; API read-only JSON 28/28.
- `npm test`: frontend 89/89 + Node 145/145 PASS.
- `npm run build`: PASS; `dist/assets/index-DgbgRsT8.js`, `dist/assets/index-R1nuadtV.css`.
- `git diff --check`: PASS.
- prohibited serialized/loggable hit count: `0`.

## Operation and authority boundary

- actual device observation operations: `0`
- provider/session/thread/browser operations: `0`
- credential/private-store operations: `0`
- network listener/hosted DB/queue operations: `0`
- push/deploy/release/external mutation or message: `0`
- runtime/API/UI/registry/Gate/Map changes: `0`
- O1-O6, O2 real two-location proof, Phase 3, QA, Release Audit, Cherry acceptance and external completion remain open.

## Rollback and residual unknowns

- Revert implementation commit `2d0134da1e243e9302bd6eb6a7d7d3988dddfab4` to restore the fresh re-QA baseline.
- Preserve this receipt as evidence history unless separately authorized to revert it.
- No real PC/device, provider, Codex session/thread, transport, persistence or hosted recovery was exercised.
- The structural policy remains synthetic candidate evidence pending independent fresh QA.
