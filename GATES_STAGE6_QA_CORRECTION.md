# Stage 6 NEEDS_REVISION correction gates

Candidate under correction: `48a488f28781b969768ec7935ab00aaffe37ba28`
Authority: Cherry-approved OUTCOME-only Builder correction

- [x] C1: Stage state and implementation/test/evidence axes derive from referenced Gate `PROVES` and closed evidence, without aggregate inference.
  CHECK: npm run test:package-model -- --test-name-pattern='source-grounded Stage semantics'
  EXPECT: exit 0
  EVIDENCE: Package model 23/23 PASS; closed OUTCOME Stage 3–5 axes resolve from Gate `PROVES`/`EVIDENCE`, while unsupported axes remain `not_sourced` and no cross-Stage percentage exists.
- [x] C2: Mobile current/next, GitHub evidence, and every Stage remain readable and discoverable at 390×844.
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: Chrome 390×844 reports current/next and GitHub readable, all 8 OUTCOME Stages discoverable without an internal scroll trap, controls >=44px, honesty text >=11px.
- [x] C3: Browser geometry detects clipped descendants and real pairwise UI intersections at 1440×900 and 390×844.
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: Chrome 1440×900 and 390×844 inspect clipped descendants and relevant pairwise bounding-box intersections; both report clipped=0, intersections=0, viewportEscape=0.
- [x] C4: Focus, contrast/type tier, textual source status, and selected Stage semantics meet the correction contract.
  CHECK: npm run test:dashboard -- --test-name-pattern='accessibility correction'
  EXPECT: exit 0
  EVIDENCE: semantic regression PASS; browser proves one `aria-pressed=true` Stage, textual Package source status, 3px focus-visible outline at 14.83:1, honesty text >=11px and measured text contrast >=4.5:1.
- [x] C5: Source, Stage, role/binding, locked, queued, and freshness vocabulary remain entity-specific and source-grounded.
  CHECK: npm run test:package-model -- --test-name-pattern='entity state vocabulary|evidence freshness'
  EXPECT: exit 0
  EVIDENCE: model regressions separate Package source from Stage/entity/binding labels, derive queued/locked from dependencies, preserve idle roles without activity, and keep old but structurally valid Package sources valid; source observation and binding freshness are separate.
- [x] C6: Cherry Note counts and group labels come only from Gate source; absent evidence remains null/unknown.
  CHECK: npm run test:collector -- --test-name-pattern='no invented fallback|source group labels'
  EXPECT: exit 0
  EVIDENCE: collector 9/9 PASS; missing Gate/rollout yields null counts and percentages. Stage 33 renders 9 source headings and 57/57 checks; Korean-primary remains open because no Package source supplies Korean labels.
- [x] C7: Public API/UI exposes an immutable served build commit/tree receipt while NOW remains live and unpinned, with no secret/runtime IDs.
  CHECK: npm run test:runtime -- --test-name-pattern='served build receipt'
  EXPECT: exit 0
  EVIDENCE: runtime/security 14/14 PASS; API/UI receipt exposes safe repo/ref, 12-character commit/tree and asset identity, labels NOW live/unpinned, and redacts arbitrary full 40/64-hex values and runtime IDs.
- [ ] C8: Full frontend/Node, production build, local/live browser, public 200/405, redaction, scope, and diff checks pass on one candidate.
  CHECK: npm test && npm run build && npm run test:browser && npm run test:security && npm run check:scope && git diff --check
  EXPECT: exit 0
  EVIDENCE: pending
- [x] C9: Prior-candidate independent QA evidence is included byte-for-byte and remains `NEEDS_REVISION`, not fresh QA.
  CHECK: test "$(shasum -a 256 docs/STAGE6_INDEPENDENT_UX_PRODUCT_QA_48a488f.md | awk '{print $1}')" = 3561dc76b5ff7e89dddbf5fc381ead2c63223e1623ddd06bb2eba32cac3ec61a
  EXPECT: exit 0
  EVIDENCE: SHA-256 `3561dc76b5ff7e89dddbf5fc381ead2c63223e1623ddd06bb2eba32cac3ec61a`; verdict remains prior-candidate `NEEDS_REVISION` with false_completion_count=6.
