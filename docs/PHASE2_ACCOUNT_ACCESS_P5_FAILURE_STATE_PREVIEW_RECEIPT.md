# Phase 2 · P5 인증 실패 상태 Preview 배포 영수증

판정: `PREVIEW_READY_ONLY · P5 OPEN · PRODUCTION UNCHANGED`

## Exact source and deployment

- deployed commit: `c194f3297d728020d6af16bef29ddb179b339b32`
- deployed tree: `3d6b54bf283b72dcde9e5ed9cb7bfb8ebc1c3ba7`
- reviewed product correction: `8b66ab8a321c29a32f5c0fe481a0f6d18b22833b`
- branch: `codex/hp1-session-bearer`
- deployment: `dpl_Gf9sidpNc2sh7HNt2ChpHJywDCbG`
- immutable Preview: `https://outcome-potry7i0g-white-castle.vercel.app`
- stable Preview: `https://outcome-git-codex-hp1-session-bearer-white-castle.vercel.app`
- state: `READY`
- alias error: `none`
- built assets: `index-rrlaqkOi.js`, `index-DfyTr5bf.css`

## Live observations

Vercel 인증을 통과한 기존 Chrome 세션에서 stable Preview `/workspace`를 새로고침해 다음을 직접 확인했다.

- document title `OUTCOME`
- `Cherry 계정으로 확인` heading `1`
- `Google로 계속` button `1`
- 로그인 전 private project node `0`
- 사용자 표시 `completionAuthority=false`
- runtime asset가 exact candidate asset과 일치

Vercel protected fetch에서 `/api/private/config`는 `200`, hosted identity enabled, provider metadata `3`, `completionAuthority=false`였다. publishable key를 포함한 모든 setting value, account identifier, temporary access query, cookie와 nonce는 영수증에 기록하지 않았다.

## Regression and boundary

- correction Gate: `C1-C5 5/5`
- deploy Gate: `D1-D6 6/6`
- focused UI: `18/18`
- account access: Node `32/32` + frontend `21/21`
- full: frontend `81/81` + Node `112/112`
- security: `29/29`
- mutation matrix on exact deployed source: `32/32=405`; API read-only JSON `28/28`
- built API/HTML/bundle/rendered UI prohibited identifiers: `0`
- branch push only; origin main remained `270ff7be8420765f9324dccfcd754af37c794c2f`
- Production remained deployment `dpl_Gec13FezseAJABeMCrBM4k8Sc1We`, source commit `9cbf834196e3982a7822c422a9a9b18a74d66692`, aliases unchanged

## Rollback

Code regression 시 직전 READY Preview `dpl_A7wUkQoZ45jUoY1nF6e7EJ4ttKZT` / commit `ea4a4e542142ac9c5ee27372a47ffef3b51957fd`로 branch Preview alias를 되돌린다. environment rollback과 deployment rollback은 분리하며 Preview setting value를 영수증에 기록하지 않는다. rollback 뒤 `/workspace`, private config, mutation `405`, prohibited hit `0`, Production 불변을 다시 확인한다.

## Remaining work

배포 후 Cherry의 MacBook Google 재로그인 완료 확인과 동일 Preview의 session/workspace HTTP `200/200` 집계가 일치해 P5 실기기 행렬은 `11/19`다. MacBook/mobile email code·만료·철회·인증 제공자 장애 `8/19`가 미실행이다. 이 배포는 P5, HP1, HP2, hosted QA, Release Audit, Cherry acceptance, Production, Phase 2 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
