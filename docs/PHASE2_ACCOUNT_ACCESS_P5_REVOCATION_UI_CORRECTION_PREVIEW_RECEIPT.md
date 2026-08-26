# Phase 2 · P5 모바일 철회 UX 교정 Preview 배포 영수증

판정: `PREVIEW READY · LIVE API DIRECT PROBE PARTIALLY BLOCKED · P5 10/19 OPEN · PRODUCTION UNCHANGED`

## 배포 신원

- source commit: `ebac7d538152fddc432fcdb4d1ee7b80a6cbe87b`
- source tree: `83cb4182f086b3cc0ad1634fd2b44d3c6c151fc1`
- branch: `codex/hp1-session-bearer`
- Preview deployment: `dpl_4P1AusHZo37fTCY92oUpVk1CrmHP`
- immutable URL: `https://outcome-qmr7yyi8u-white-castle.vercel.app`
- stable branch URL: `https://outcome-git-codex-hp1-session-bearer-white-castle.vercel.app/workspace`
- created: `2026-08-26T10:19:23.842Z` / `2026-08-26 19:19 KST`
- state / target / source: `READY / null / git`
- prior Preview rollback target: `dpl_3MYfocjsQ6XvTrCoTNXE6Pp4U7wY`

## 배포 전 근거

- exact candidate focused `16/16`
- account Node `32/32` + frontend `29/29`
- security `29/29`
- mutations `32/32=405`
- public prohibited identifier `0`
- full frontend `89/89` + Node `112/112`
- isolated production build PASS: JS `index-BoBJkuNs.js`, CSS `index-DfyTr5bf.css`
- correction Gate `6/6`, Parent promotion Gate `6/6`

이 숫자는 exact candidate의 로컬 검증 결과다. 배포 런타임 직접 관측과 섞거나 실기기 PASS로 승격하지 않는다.

## Preview 직접 관측

- Chrome의 Vercel 승인 세션에서 stable branch URL `/workspace`가 `OUTCOME` title과 로그인 전 비공개 워크스페이스 DOM을 렌더했다.
- error overlay는 없고 같은 탭의 console error는 `0`이다.
- 새 deployment의 Vercel runtime 집계는 `/api/private/config` `200` 2회를 기록했다.
- Vercel protected fetch는 동일 HTML의 `<title>OUTCOME</title>`, JS `index-BoBJkuNs.js`, CSS `index-DfyTr5bf.css`를 확인했다.
- build log는 `/vercel/output`을 7초에 완료했다. `esbuild` allow-scripts와 Node engine 자동 major upgrade 안내는 warning이며 build failure가 아니다.

## 미확인 경계

Vercel Deployment Protection은 자동화된 API 직접 탐색과 POST probe를 앱 실행기 앞단에서 차단했다. 보호 설정을 낮추거나 우회하지 않았다. 따라서 배포된 `/api/private/session`·`/api/private/workspace`의 비로그인 `401`, public dashboard `404`, mutation `405 read_only`는 이번 창의 live runtime PASS로 기록하지 않는다. exact candidate의 로컬 회귀는 해당 경계를 통과했지만 live 관측을 대신하지 않는다.

다음 실제 로그인/실기기 검수 창에서 현재 Preview의 session/workspace와 실제 SDK의 no-request 또는 stale-token `401` 경로를 다시 관측한다.

## 변경 금지 경계

- Production은 이번 실행 전 생성된 `dpl_Gec13FezseAJABeMCrBM4k8Sc1We`, main SHA `9cbf834196e3982a7822c422a9a9b18a74d66692`, `target=production`, `READY`다.
- Production promote·rollback·alias 변경을 실행하지 않았다.
- Vercel 환경값·Clerk·Supabase·DNS·domain·release 설정을 변경하지 않았다.
- 세션 철회나 다른 외부 인증 mutation을 실행하지 않았다.

## 진행 판정

교정 candidate는 Preview READY지만 새 모바일 철회 실기기 검수는 아직 실행하지 않았다. P5는 `10/19 OPEN`이며 HP1, HP2, hosted QA, Release Audit, Cherry acceptance, Production, Phase 2와 `EXTERNAL_OUTCOME_COMPLETE`도 계속 열려 있다.
