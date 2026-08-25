# Gates: OUTCOME compact project header

Scope: Compress the project header by removing duplicate snapshot/NOW presentation while preserving source truth, current work, role state, refresh, and responsive usability.

- [x] H1: The separate deployment-snapshot badge and repeated NOW metadata line are absent from the primary header; snapshot boundary data remains available in the dashboard and technical evidence.
  EVIDENCE: Component and 4-viewport browser assertions require no `.oc-snapshot-badge` and no `.oc-now-summary > span`. Final DOM measured both absent while `data-snapshot-boundary=deployment_snapshot` and the technical evidence copy remain present.

- [x] H2: Desktop hides the otherwise-empty topbar and renders the complete project header at no more than 128px, with project title, one-line purpose, NOW headline, source status/time, refresh, and four role states visible.
  EVIDENCE: 1440×900 measured topbar `display:none`, height 0; Hero height 128px; refresh 44px; four role rows 36px with role name/status each one line. Result map top moved to 289.13px from the prior 357.13px browser receipt.

- [x] H3: Tablet/mobile retain the navigation trigger, keep all role names/statuses to exactly one line, and reduce header height without clipping, overlap, or horizontal overflow.
  CHECK: npm run build:isolated && npm run test:browser
  EXPECT: /browser assertions passed/i
  EVIDENCE: `npm run build:isolated && npm run test:browser` PASS across 1440×900, 390×844, 375×812, and 844×390. Mobile Hero measured 204.97–219.81px at 390px and 219.81px at 375px; role rows 34px, roleLines=1, roleStatusOverflow=0, intersections=0, documentOverflow=0.

- [x] H4: Phase→Scope→Stage→Gate, current-vs-selected distinction, project switching/search, and technical evidence behavior remain unchanged.
  CHECK: npm run test:dashboard
  EXPECT: /73 passed|73\/73|Tests\s+73 passed/
  EVIDENCE: `npm run test:dashboard -- --run` PASS — 4 files, 73/73 tests. Full browser traversal completed 3 projects × Phase/Scope/Stage selections at all four viewports with hierarchy, current-return, project switch/search, and technical evidence assertions intact.

- [x] H5: Full frontend/Node and security/public-boundary suites remain green with no prohibited disclosure.
  CHECK: npm run test && npm run test:security
  EXPECT: /28 passed|28\/28/
  EVIDENCE: `npm run test` PASS — frontend 76/76 and Node 109/109. `npm run test:security` PASS — 28/28; stable snapshot prohibited disclosures=0 and Gate evidence fields=0; client Vercel Git metadata leaks=0.

- [x] H6: Desktop 1440×900 and mobile 390×844 screenshots are visually inspected; the header reads as one compact information band and the result map moves materially upward.
  EVIDENCE: Inspected `/tmp/outcome-compact-header-desktop-1440x900.png` and `/tmp/outcome-compact-header-mobile-390x844.png`. Both show one compact title/source/NOW/roles band with no badge or metadata duplication; mobile result map top measured 515.42px versus the prior 577.22px receipt.

- [x] H7: The change is isolated to this header-density slice; protected roadmap, Production, providers, database, DNS, and release state remain untouched.
  EVIDENCE: Product/test changes are limited to `src/components/OutcomeDashboard.tsx`, `src/components/OutcomeDashboard.test.ts`, `src/styles.css`, `scripts/browser-assertions.mjs`, and `scripts/browser-assertions.test.mjs`, plus this Gate evidence. No push, deploy, provider, database, DNS, Production, or release mutation was performed; the protected roadmap remains untracked and untouched.
