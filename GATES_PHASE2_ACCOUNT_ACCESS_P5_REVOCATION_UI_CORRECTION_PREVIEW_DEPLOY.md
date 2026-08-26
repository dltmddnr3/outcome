# Phase 2 · P5 모바일 철회 UX 교정 Preview 배포 Gates

Outcome: 승인된 exact candidate만 GitHub 비운영 브랜치에 push하여 Vercel Preview로 배포하고, Production·환경·인증 공급자·데이터 저장소를 변경하지 않은 채 배포 신원과 읽기·보안 경계를 검증한다.

- [x] D1: push 직전 HEAD·tree·원격 기준과 추적 파일 상태가 승인 시점과 일치한다.
  PROVES: authorization
  EVIDENCE: push 직전 HEAD `ebac7d538152fddc432fcdb4d1ee7b80a6cbe87b`, tree `83cb4182f086b3cc0ad1634fd2b44d3c6c151fc1`, 원격 기준 `4613372adbec17e35c2498e55ab4210cc8b33c34`와 tracked-clean 상태를 확인했다. 사용자 파일 `docs/ROADMAP 2.md`는 열거나 변경하지 않았다.
- [x] D2: `codex/hp1-session-bearer`만 push되고 원격 브랜치가 exact candidate를 가리킨다.
  PROVES: source_identity
  EVIDENCE: `git push origin codex/hp1-session-bearer`는 `4613372..ebac7d5` 한 브랜치만 갱신했고 push 뒤 local·origin HEAD가 모두 `ebac7d538152fddc432fcdb4d1ee7b80a6cbe87b`다.
- [x] D3: exact candidate의 Vercel Preview가 READY이며 고정 브랜치 Preview 주소가 해당 배포를 가리킨다.
  PROVES: deployment
  EVIDENCE: Vercel Preview `dpl_4P1AusHZo37fTCY92oUpVk1CrmHP` / `outcome-qmr7yyi8u-white-castle.vercel.app`는 exact Git SHA `ebac7d538152fddc432fcdb4d1ee7b80a6cbe87b`, branch `codex/hp1-session-bearer`, target `null`, state `READY`다. branch alias는 `outcome-git-codex-hp1-session-bearer-white-castle.vercel.app`다.
- [ ] D4: 배포 화면·config·private API·mutation의 읽기 및 fail-closed 경계가 계약대로 응답한다.
  PROVES: runtime_security
  EVIDENCE: 로그인 전 `/workspace`는 title `OUTCOME`, 의미 있는 DOM, error overlay 없음, console error `0`; Vercel runtime은 새 deployment의 `/api/private/config` `200` 2회를 집계했다. 그러나 Deployment Protection이 자동화된 private GET·mutation 직접 probe를 앱 앞단에서 차단해 배포 런타임의 `401`·`405`는 이번 창에서 직접 관측하지 못했다. exact candidate의 로컬 회귀는 private fail-closed와 mutation `32/32=405`를 통과했으나 배포 관측을 대신하지 않는다.
- [x] D5: Production alias·환경값·Clerk·Supabase·도메인 설정이 변경되지 않았고 rollback 대상이 보존된다.
  PROVES: mutation_boundary
  EVIDENCE: 새 배포는 `target=null` Preview다. Production은 이 실행 전 생성된 `dpl_Gec13FezseAJABeMCrBM4k8Sc1We`, main SHA `9cbf834196e3982a7822c422a9a9b18a74d66692`, target `production`, READY로 유지된다. Preview rollback 기준 `dpl_3MYfocjsQ6XvTrCoTNXE6Pp4U7wY`도 보존했다. 환경값·Clerk·Supabase·도메인 설정 mutation은 실행하지 않았다.
- [x] D6: 배포 영수증과 OUTCOME 추적 문서가 실제 관측값만 기록하며 P5·Phase 2·외부 완료를 닫지 않는다.
  PROVES: progress_integrity
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_PREVIEW_RECEIPT.md`, `docs/OUTCOME_MAP.md`, `docs/PHASE2_ACCOUNT_ACCESS_P5_DEVICE_MATRIX.md`에 Preview READY와 live API 직접 probe 미확인을 함께 기록했고 P5를 `10/19 OPEN`으로 유지했다.

ABANDON: D4 배포 private `401`·mutation `405` 직접 관측은 Vercel Deployment Protection이 자동화 요청을 앱 앞단에서 차단해 이번 배포 창에서 완료하지 못했다. 보호를 낮추거나 우회하지 않으며 다음 승인된 실제 로그인/실기기 창에서 다시 확인한다.

ABANDON: 이 Gate는 Production 승격·환경값 변경·Clerk/Supabase/domain 변경·세션 철회·실기기 PASS·QA·Audit·Cherry acceptance·Phase 2 완료·`EXTERNAL_OUTCOME_COMPLETE`를 승인하지 않는다.
