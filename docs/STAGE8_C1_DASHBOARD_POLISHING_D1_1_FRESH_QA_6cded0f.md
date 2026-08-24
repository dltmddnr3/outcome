# Stage 8 C1 polishing D1-1 — final fresh independent QA

- 관측일: 2026-08-24 KST
- fresh Claude Opus session: `6033eeab-5ade-4ac7-b39f-7d975559ea18`
- 역할: affected-scope UX & Product QA, read/test/use-only
- verdict: **PASS**
- `false_completion_count`: **13** (보존)

## Exact identity and separation

- verification commit: `6cded0f272df1d5a629c0ba5ef62a77ae08f8ecb`
- verification tree: `2021782aafbfe036a6c6f85a2997c7f618264ef4`
- verification parent: `5248a3645d98d20d2208d016f6af9ede17d6d1d0`
- origin/main: verification commit와 일치
- product commit/tree: `0ad19c38e9b25164f6150e937665da93af29f728` / `391674734587a01e953de4f15be52fdc8577bf85`
- public receipt: `0ad19c38e9b2` / `391674734587` / `index-CCeEkpGH.js`
- public URL: `https://escape-lined-mercury-there.trycloudflare.com/cherry-note-dashboard` (`GET 200`)
- runtime identity: origin PID `55871`, tunnel PID `88741`; signal/restart 없음

Verification correction은 제품 source/runtime bytes를 바꾸지 않았다. Product pin과 HEAD의 `src`, `server`, `index.html` Git objects가 동일했다. Public/local/candidate asset은 byte-identical이었다.

| artifact | SHA-256 |
|---|---|
| `index-CCeEkpGH.js` | `174b753546aa425f8ccd4f92b40cc25d5f2398a8566cf5d876e28d350d9e4bcc` |
| dashboard HTML | `860aa70948fa6c9bd147ca58216cf12f39e1406dd7084fa4820e35667faa4479` |

## D1-1 red/green proof

Runtime name은 `${viewportName}/${projectId}/${stageId}`이고 실제 viewport name은 `mobile-390x844` 또는 `remote-mobile-390x844`이다.

- old predicate: `name.startsWith('mobile/')`
- corrected predicate: `/^(?:remote-)?mobile-390x844\//.test(name)`

| case | old | corrected | result |
|---|---|---|---|
| local mobile `1689` | false-green PASS | reject | PASS |
| remote mobile `1689` | false-green PASS | reject | PASS |
| mobile boundary `1688` | pass | pass | PASS |
| current Cherry Note `1679` | pass | pass | PASS |
| current OUTCOME `1646` | pass | pass | PASS |
| desktop `1689` | unaffected | unaffected | PASS |

Old predicate를 HEAD test fixture와 결합한 독립 red control은 `3 tests · 2 pass · 1 fail`, `Missing expected exception`으로 Builder의 red-first 주장을 재현했다. Corrected harness는 `3/3 PASS`였다.

실제 public `measureDashboard()` 결과에도 fault injection을 수행했다.

- local-mobile real `1646`: baseline PASS, injected `1689` throws, `1688` PASS
- remote-mobile real `1646`: baseline PASS, injected `1689` throws, `1688` PASS
- desktop real `1004`: injected `1689` remains unaffected

따라서 guard는 실제 traversal 경로에서 도달 가능하며 D1-1은 닫혔다.

## Fresh regression results

- D1-1 harness: `3/3 PASS`
- frontend: `29/29 PASS`
- Node: `61/61 PASS`
- security: `16/16 PASS`
- local browser: `36/36 PASS`
- public browser: `36/36 PASS`
- local/public prohibited identifiers: `0/0`
- local mutations: `24/24 = 405 read_only`
- public mutations: `24/24 = 405 read_only`
- scope: `PASS` (`17` scoped product/runtime/test paths)
- runbook: `PASS`
- geometry: unexpected English `0`, fallback `0`, clipping `0`, ellipsis `0`, intersections `0`, viewport escape `0`, document overflow `0`, controls `>=44`, text contrast `>=4.5`, focus contrast `>=14.83`

## D1–D3 remeasurement

- D1: 390×844 role/Scope/Stage rails are 2-column. Gate row top is Cherry Note `1679px`, OUTCOME `1646px`, both `<=1688px` locally and publicly.
- D2: every measured project×viewport state has exactly one Hero H1. Outline is `1,2,3,3,3,3,4,4` with no skip.
- D3: live OUTCOME `stale + activity` shows `관측 오래됨` in headline and metadata and retains `세션 활동은 진행률이 아닙니다.` Cherry Note unbound state makes no false progress claim.

## 30-second reachability task

Cold navigation에서 project tab을 선택하고 Hero의 현재 위치와 다음 경계를 읽는 경로를 local 4회, public 8회 측정했다.

- `12/12` tasks `<=30s`
- maximum: `1655ms`
- scrolling: `0`
- desktop/mobile 모두 exactly two orientation strings visible

Cherry Note는 `새 사용성·제품 검수` 현재 위치와 `별도 신규 출시 감사` 다음 경계를, OUTCOME은 `Cherry 승인` 현재 위치와 `다음 단계 근거 없음` 경계를 표시했다.

## Findings and disposition

Blocking defect는 없다. **D1-1은 실제로 닫혔으며 R10 evidence는 PASS로 인정할 수 있다.** QA는 Gate 파일을 수정하지 않았다.

Non-blocking observations:

- `test:remote-browser` 단독 실행은 별도 3-test harness를 선행하지 않지만 remote traversal 내부 guard는 실행된다.
- predicate는 현재 계약 viewport `390x844`에 명시적으로 고정돼 있어 향후 mobile viewport 추가 시 새 guard가 필요하다.
- Cherry Note mobile budget headroom은 `9px`다.
- 이전 QA의 absolute candidate-dist symlink, stale PID record, dead H2 CSS 관찰은 그대로다.

다음 경계는 계속 열린다:

- R11 / C1 / C2
- Cherry acceptance / release
- `MVP_SCOPE_CLOSED`
- `EXTERNAL_OUTCOME_COMPLETE`

제품 bytes, Gate, runtime, public URL은 변경하지 않았다. `docs/ROADMAP 2.md`는 열기·읽기·검색·hash·stage·수정하지 않았다.
