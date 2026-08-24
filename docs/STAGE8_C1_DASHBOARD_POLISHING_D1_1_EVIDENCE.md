# OUTCOME Stage 8 C1 polishing D1-1 · Builder evidence

관측일: 2026-08-24 KST

## 경계

- 시작 HEAD/origin: `5248a3645d98d20d2208d016f6af9ede17d6d1d0`
- 검증 대상 제품 bytes: `0ad19c38e9b2` / tree `391674734587` / `index-CCeEkpGH.js`
- 제품 source, CSS, markup, API, Package와 공개 origin/tunnel은 변경하지 않았다.
- R10, R11, C1, C2와 모든 Cherry acceptance/release/completion 경계는 open이다.
- 누적 `false_completion_count=13`을 보존한다.

## Red-first

`scripts/browser-assertions.test.mjs`를 먼저 추가해 실제 이름 두 개를 직접 입력했다.

- `mobile-390x844/cherry-note/stage`, `gateRowTop=1689`
- `remote-mobile-390x844/outcome/stage`, `gateRowTop=1689`

기존 `name.startsWith('mobile/')`에서는 예외가 발생하지 않아 Node test가 `Missing expected exception`으로 실패했다: `3 tests · 2 pass · 1 fail`.

## 최소 교정

모바일 budget predicate를 `^(?:remote-)?mobile-390x844/`로 제한했다. 이 predicate는 현재 local/remote viewport 이름만 허용하며 다른 mobile 이름을 묵시적으로 통과시키지 않는다. Desktop 이름에는 1688px budget을 적용하지 않는다.

## Green evidence

- harness: `3/3 PASS`
  - local/remote mobile `1689`: 둘 다 reject
  - mobile `1688`, 현행 `1679`, `1646`: pass
  - desktop `1689`: mobile budget 미적용, pass
- frontend: `29/29 PASS`
- Node: `61/61 PASS`
- security: `16/16 PASS`
- isolated production build: `PASS`, 제품 asset `index-CCeEkpGH.js` 유지
- local browser: projects `2`, selected Stages `18` per viewport, `36/36`; mobile top `1679/1646`
- remote browser: projects `2`, selected Stages `18` per viewport, `36/36`; mobile top `1679/1646`
- local/public boundary: API/HTML/bundle/rendered UI prohibited identifiers `0`
- local/public mutation: 각각 `24/24` exact `405 read_only`
- scope/runbook: `PASS`
- `git diff --check`: `PASS`

이 artifact는 QA 판정을 대체하지 않으며 D1-1 harness correction evidence만 기록한다.
