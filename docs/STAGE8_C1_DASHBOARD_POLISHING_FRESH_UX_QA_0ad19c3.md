# Stage 8 C1 dashboard polishing — fresh independent UX & Product QA

- 실행일: 2026-08-24 KST
- fresh Claude Opus session: `f591ae27-c736-4257-b900-3f81e5bed2c1`
- 역할: affected-scope UX & Product QA, read/test/use-only
- 판정: **NEEDS_REVISION**
- `false_completion_count`: **13** (보존)

## Immutable candidate

- commit: `0ad19c38e9b25164f6150e937665da93af29f728`
- tree: `391674734587a01e953de4f15be52fdc8577bf85`
- parent: `0649133c97ff772f4ec024c12afc36694079d5ab`
- origin/main: candidate와 일치
- public asset: `index-CCeEkpGH.js`
- public URL: `https://escape-lined-mercury-there.trycloudflare.com/cherry-note-dashboard` (`GET 200`)
- runtime identity: origin PID `55871` → `127.0.0.1:8791`, tunnel PID `88741` → 해당 origin. signal/restart 없음.

Public, repo dist, candidate-dist, exact-tree clean isolated `npm ci` build가 byte-identical이었다.

| artifact | SHA-256 |
|---|---|
| `index.html` | `860aa70948fa6c9bd147ca58216cf12f39e1406dd7084fa4820e35667faa4479` |
| `index-CCeEkpGH.js` | `174b753546aa425f8ccd4f92b40cc25d5f2398a8566cf5d876e28d350d9e4bcc` |
| `index-Bfe3bOfF.css` | `101ca2c9670fdf7f55e4a9b35751f2d05d14ec58e179039610c5570daef462b1` |

## Independent measurements

### D1 — mobile funnel placement and geometry

390×844에서 18개 selected Stage 전수를 각 프로젝트별로 직접 측정했다.

| project | 완료 조건 행 document top | limit |
|---|---:|---:|
| Cherry Note | `1679px` | `<=1688px` PASS |
| OUTCOME | `1646px` | `<=1688px` PASS |

- 36상태 중 limit 초과: `0`
- mobile columns: 역할 카드 `2`, Scope rail `2`, Stage rail `2`
- clipping `0`, sibling intersection `0`, viewport escape `0`, document overflow `0`, ellipsis `0`
- 44px 미만 control `0`; 최소 text `11px`; 최소 text contrast `4.70`; focus contrast `14.83`

### D2 — heading semantics

- 36/36 loaded states에서 document H1 `1`, visible H1 `1`, Hero 내부 H1 `1`
- heading outline: `1,2,3,3,3,3,4,4`; level skip `0`
- Hero title style: desktop `28px/30.24px`, mobile `23px/24.84px`, weight `700`, margin `4px 0 7px`; 시각 regression 없음

### D3 — stale NOW honesty

Live OUTCOME은 실제 `stale + activity` 상태였고 headline과 metadata 모두 `관측 오래됨`을 표시했다. `세션 활동은 진행률이 아닙니다.`도 유지됐다. Synthetic response interception 결과:

| variant | headline stale | metadata stale | activity retained | disclaimer |
|---|---:|---:|---:|---:|
| stale + activity | yes | yes | yes | yes |
| fresh + activity | no | no | yes | yes |
| stale + no activity | yes | yes | n/a | yes |
| unbound | no | no | n/a | yes |
| unknown | no | no | n/a | yes |

### Full traversal and checks

- public traversal: projects `2` × selected Stages `18` × viewports `2` = `36/36`
- current funnel remained invariant during historical exploration; non-current selections `34/34` showed `탐색 중 · 실제 현재 위치 유지`
- technical details default-collapsed `36/36`
- unexpected English `0`, translation fallback `0`
- motion: synthetic active+fresh에서 live card 최대 `1`; reduced-motion에서 animation `none`, static bars/ARIA retained
- frontend `29/29`, Node `61/61`, security `16/16`
- local/public prohibited identifiers `0`
- mutation local `24/24=405`, public `24/24=405`
- scope PASS (`17` scoped paths), runbook PASS
- local browser `36/36`, remote browser `36/36`

## 30-second task evidence

각 viewport/project를 3회 반복했다. 경로는 dashboard open → 필요 시 project tab 1회 → Hero current/next → 완료 조건 행 scroll이며 최대 2 interactions였다.

| viewport | project | current-location elapsed | actionable-next elapsed | result |
|---|---|---:|---:|---|
| desktop | Cherry Note | `0.55–1.53s` | `0.58–1.56s` | PASS |
| desktop | OUTCOME | `0.50–0.58s` | `0.53–0.60s` | PASS |
| mobile | Cherry Note | `0.57–1.07s` | `0.60–1.10s` | PASS |
| mobile | OUTCOME | `0.51–0.56s` | `0.54–0.58s` | PASS |

최대 `1.559s`; `12/12`가 30초 이내였다. 이는 정보 도달 가능성 측정이며 실제 사람의 이해 판정은 R11/Cherry 경계다.

## Blocking defect

### D1-1 — D1 numeric regression guard is unreachable

- severity: **BLOCKING verification-integrity defect**
- location: `scripts/browser-assertions.mjs`, `assertDashboardMeasurement`
- observed condition: `name.startsWith('mobile/') && result.gateRowTop > 1688`
- actual names: `mobile-390x844/...` 및 `remote-mobile-390x844/...`
- reproduction: `'mobile-390x844/cherry-note/s1'.startsWith('mobile/') === false`
- impact: 실제 제품 수치는 PASS지만, 향후 `gateRowTop=1689` 회귀도 이 CHECK에서는 PASS한다. 따라서 D1 CHECK가 EXPECT를 증명하지 못한다.
- smallest correction: mobile viewport naming을 실제 prefix와 일치시키고, `1689`가 실패하며 현행 `1679/1646`이 통과하는 red-first assertion을 추가한다. 예: `name.includes('mobile-390x844/')`.

Non-blocking observations: absolute `OUTCOME_CANDIDATE_DIST`를 public redaction script에 주면 `join()` 때문에 broken symlink가 될 수 있음; stale `public-origin.pid` record가 존재함; transient error state에는 H1 없이 H2만 있음; `.oc-hero-title h2` dead CSS가 남아 있음.

## Disposition

**NEEDS_REVISION.** D1–D3 실제 product behavior, identity, byte parity, security boundary, a11y, motion, 36-state traversal과 task reachability는 독립 PASS다. 그러나 D1 자체 회귀 guard가 발화 불가능하므로 이 후보를 R10 evidence PASS로 인정하지 않는다.

- R10: open, unedited
- R11 / C1 / C2: open
- Cherry acceptance / release / `MVP_SCOPE_CLOSED` / `EXTERNAL_OUTCOME_COMPLETE`: open
- 제품, Gate, runtime, public URL: 변경 없음
- `docs/ROADMAP 2.md`: 열기·검색·hash·stage·수정하지 않음
