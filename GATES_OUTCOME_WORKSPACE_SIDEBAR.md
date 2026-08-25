# Gates: OUTCOME workspace sidebar

Scope: Replace page-section navigation with a GPT-desktop-inspired workspace sidebar for project selection, future project operations, system management, and account access without fabricating unavailable write capabilities.

- [x] S1: The sidebar contains a compact brand and `새 프로젝트`, real project search, recent/project selection, `보관함`, integrated `연결 관리`, and one bottom account area; `현재 작업`, `결과 지도`, and `기술 증거` do not appear in the sidebar.
  EVIDENCE: Desktop/mobile screenshots and browser assertions show the needs-based workspace IA. MCP and plugins are represented once by `연결 관리`; account is absent from the middle list and exists only at the bottom.

- [x] S2: Every source project remains selectable and the selected project is distinguished with `aria-current`, text, and a non-color marker.
  CHECK: npm run test:dashboard
  EXPECT: /73 passed|73\/73|Tests\s+73 passed/
  EVIDENCE: `npm run test:dashboard -- --run` PASS — 4 files, 73/73 tests. Browser fixture matches 3 project select controls and 3 sibling project-menu controls to the 3 payload projects; selected project retains `aria-current=page`, `선택됨`, and an inset marker.

- [x] S3: The single bottom account/login area routes to the existing `/workspace` boundary; unavailable create, project context/archive, archive, and integrated connection-management writes are visibly marked `준비 중` and cannot imply successful mutation.
  EVIDENCE: Exactly one sidebar `/workspace` link is present at the bottom. `새 프로젝트`, every project menu, `보관함`, and `연결 관리` are native disabled buttons with visible `준비 중`; no mutation handler or success state was added. Search is the sole new interaction and filters only the loaded client payload with a truthful no-results state.

- [x] S4: Desktop keeps the management rail persistent; tablet/mobile use the existing modal drawer with Escape, backdrop close, focus trap/restore, body scroll lock, 44px targets, and no overflow.
  CHECK: npm run build:isolated && npm run test:browser
  EXPECT: /browser assertions passed/i
  EVIDENCE: `npm run build:isolated && npm run test:browser` PASS — asset `index-CJX5cf3u.js`; 17/17 assertion tests plus 1440x900, 390x844, 375x812, and 844x390 fixture traversal. All report documentOverflow=0, clipped=0, intersections=0, controls>=44, text>=11, contrast>=4.5, reducedMotionStatic=true. Short landscape uses a scrollable middle region while the account boundary stays anchored.

- [x] S5: The bottom account area stays visually anchored at the rail bottom and clearly communicates `로그인 또는 계정 관리` without displaying fabricated identity information.
  EVIDENCE: Computed desktop and open-mobile drawer account bottom gap is 16px; the single link reads `로그인 또는 계정 관리` / `비공개 워크스페이스` and contains no user, email, provider, or session claim.

- [x] S6: Existing Phase→Scope→Stage→Gate hierarchy, current-vs-selected distinction, source truth, progress semantics, and technical evidence content remain unchanged in the main dashboard.
  CHECK: npm run test
  EXPECT: /76 passed|76\/76/
  EVIDENCE: `npm test` PASS — frontend 5 files / 76 tests and Node 109/109. Browser fixture traversed 9 hierarchy selections and 3 selected Stages at each viewport while preserving current-stage return, technical evidence, progress, and source-group checks.

- [x] S7: Security/public-boundary checks remain green and the sidebar exposes no credentials, session identifiers, local paths, or provider metadata.
  CHECK: npm run test:security
  EXPECT: /28 passed|28\/28/
  EVIDENCE: `npm run test:security` PASS — 28/28; prohibited snapshot disclosures=0, Gate evidence fields=0, Vercel Git metadata leaks=0. Scope and runbook checks also PASS.

- [x] S8: Desktop and mobile closed/open drawer screenshots are visually inspected; the sidebar reads as one quiet workspace rail with no nested-card, badge-spam, clipping, or hierarchy duplication.
  EVIDENCE: Inspected `/tmp/outcome-workspace-sidebar-desktop-1440x900.png`, `/tmp/outcome-workspace-sidebar-mobile-closed-390x844.png`, and `/tmp/outcome-workspace-sidebar-mobile-open-390x844.png`. Brand is 12px, section/status text 11px, project/menu text 13px medium; hierarchy comes from spacing/dividers, not oversized tabs or decorative cards. All captures have horizontal overflow=0.

- [x] S9: The change is isolated to the approved sidebar slice; protected roadmap, Production deployment, providers, database, DNS, and release state remain untouched.
  EVIDENCE: Changes are limited to the dashboard sidebar component, shared sidebar CSS, focused dashboard/browser assertions, and this Gate. No dependency, server, collector, registry, auth behavior, provider, database, deployment, DNS, domain, or release mutation. The pre-existing protected roadmap remains untracked and explicitly excluded from staging.
