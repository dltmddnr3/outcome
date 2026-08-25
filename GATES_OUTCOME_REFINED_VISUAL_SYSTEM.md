# Gates: OUTCOME refined visual system

Scope: Preserve OUTCOME information architecture and source truth while giving the dashboard, global navigation, account surfaces, and responsive states one restrained Codex-like visual system.

- [x] V1: Core dashboard behavior and source-grounded semantics remain regression-safe.
  CHECK: npm run test:dashboard
  EXPECT: /73 passed|73\/73|Tests\s+73 passed/
  EVIDENCE: `npm run test:dashboard -- --run` PASS — 4 files, 73/73 tests. Phase→Scope→Stage→Gate, current-vs-selected, left navigation, Korean presentation, snapshot wording, and account component contracts remain green.

- [x] V2: The full frontend and Node suites remain green after the visual-system change.
  CHECK: npm run test
  EXPECT: /76 passed|76\/76/
  EVIDENCE: `npm test` PASS — frontend 5 files / 76 tests and Node 109/109 tests.

- [x] V3: Security and public-boundary checks remain green with no prohibited disclosure.
  CHECK: npm run test:security
  EXPECT: /28 passed|28\/28/
  EVIDENCE: `npm run test:security` PASS — 28/28 tests; stable snapshot prohibited disclosures=0, Gate evidence fields=0, Vercel Git metadata leaks=0, Clerk browser markers=3.

- [x] V4: Production build and four-viewport browser assertions pass with no overlap or horizontal overflow.
  CHECK: npm run build:isolated && npm run test:browser
  EXPECT: /browser assertions passed/i
  EVIDENCE: `npm run build:isolated && npm run test:browser` PASS — asset `index-PeqzWeit.js`; 17/17 assertion tests plus deterministic 3-project fixture over 1440x900, 390x844, 375x812, and 844x390. Every viewport reports documentOverflow=0, clipped=0, intersections=0, viewportEscape=0, controls>=44, text>=11, contrast>=4.5, reducedMotionStatic=true.

- [x] V5: Visual hierarchy is materially refined without changing the dashboard hierarchy or adding decorative UI: flat neutral surfaces, restrained lime accent, consistent radii, typography, dividers, icons, and 150-300ms interaction feedback.
  EVIDENCE: Shared near-black tokens now govern dashboard, rail/drawer, login, and workspace; large surfaces compute `background-image:none`, `box-shadow:none`, radius<=10px; link feedback computes 180ms. Radial atmosphere, repeating pending stripes, oversized login shadow, and Inter dependency were removed. Source-grounded progress remains the only gradient encoding. Final `kill-ai-slop` scan for groups 06/12/20/21/31/33/34 reports no signals; status-node circles remain intentional semantic markers.

- [x] V6: Desktop, tablet, mobile portrait, and mobile landscape renders are visually inspected; navigation, current/selected distinctions, result map, Gate detail, and account surfaces remain legible.
  EVIDENCE: Visually inspected captures at 1440x900, 1024x768, 390x844, and drawer-open 390x844 plus automated 375x812 and 844x390. Desktop preserves the four-column map; tablet preserves the connected Phase/Scope/Stage/Gate surface; mobile retains the four-level drill-down and a 320px open drawer. Also inspected disabled account surfaces at 1440x900 and 390x844; both are flat, legible, and overflow=0. `npm run test:account-access-browser` PASS — 3 viewports x 9 settled states plus loading and ready login/logout hierarchy; 200% zoom overflow=0.

- [x] V7: Accessibility polish is preserved: 44px controls, visible focus, semantic state beyond color, reduced-motion behavior, drawer focus/scroll behavior, and readable dark-mode contrast.
  EVIDENCE: Browser assertions measure minimum controls 44px, text>=11px, contrast>=4.5 and focus contrast>=14.38; active navigation keeps aria-current plus visible labels/inset marker; mobile hierarchy keeps `선택 중`; reduced motion has no active animation. Existing Escape/backdrop/focus restoration and body scroll lock tests remain green.

- [x] V8: The change is isolated to the approved visual-system slice, and the protected roadmap plus Production deployment remain untouched.
  EVIDENCE: Product change is limited to `src/styles.css`; assertions are limited to dashboard/browser test surfaces and this Gate. No dependency, server, collector, registry, auth behavior, deployment, domain, DNS, provider, or release mutation. The pre-existing untracked protected roadmap remains untouched and is excluded explicitly from staging.
