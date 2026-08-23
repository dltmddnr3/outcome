# Stage 8 C1 한글화 Fresh QA correction Builder 근거

관측일: 2026-08-24 KST

시작 기준: `cdf45e6d3c71798ad86d013890c84b41c0b7984a`

권한 경계: OUTCOME presentation과 Builder Gate만 수정합니다. Package 원본 값과 진행 의미, Cherry Note iOS, 과거 QA 문서는 변경하지 않습니다. `C1K7`, `C1K8`, `K7`, `K8`, C1·C2, Cherry 승인과 출시 경계는 열려 있습니다. 누적 `false_completion_count=13`을 보존합니다.

## Red-first

- 현재 렌더 가능한 미완료 완료 조건 전수 검사에서 `ANQ1–ANQ8`, `MC7–MC9` fallback 11건을 재현했습니다.
- 현재 렌더되는 근거 축 검사에서 미번역 source value fallback 6건을 재현했습니다.
- 인증 오류 검사에서 `invalid_credentials` raw 식별자 노출을 재현했습니다.
- 세 회귀를 source ID mapping 뒤 같은 명령으로 재실행해 3/3 통과했습니다.

## 구현

- 현재 렌더 가능한 미완료 완료 조건 22개 전부가 source ID 기반 자연스러운 한글 설명을 갖습니다. 숫자나 완료 상태는 변경하지 않습니다.
- 여섯 긴 근거 축 값을 source value 기반 한글 문구로 투영합니다.
- 인증 오류 `invalid_credentials`, `too_many_attempts`와 알 수 없는 backend 식별자를 raw 노출 없이 한글로 표시합니다.
- 사용자 화면의 raw `completion_authority=false`를 제거하고 `프로젝트 ID`를 `프로젝트 식별자`로 교정했습니다.
- written K3와 자동 scanner 모두 Cherry·iPhone·MacBook을 고유명사 예외로 명시하며, 일반 영문 prose 예외를 넓히지 않았습니다.
- 전수 브라우저 검사는 영문뿐 아니라 `한글화 대기` surface를 `translationFallback`으로 별도 집계합니다.

## 검증

- Targeted red-first: 3 failed as expected; correction 후 3/3 PASS.
- Frontend: 22/22 PASS. Node: 61/61 PASS. Security: 16/16 PASS.
- Local public boundary: API/HTML/bundle/rendered UI prohibited identifiers=0.
- Mutation: local 24/24 = 405/read_only.
- Scope: 17 product/runtime/test files; Desk·Slack·relay·provider dependency 0.
- Runbook: PASS.
- 공유 public `dist/`를 바꾸지 않는 detached production build: PASS; asset `index-puw5_elB.js`.
- Desktop 1440×900: projects=2, selectedStages=18, unexpectedEnglish=0, translationFallback=0, clipped=0, intersections=0, viewportEscape=0, documentOverflow=0.
- Mobile 390×844: projects=2, selectedStages=18, unexpectedEnglish=0, translationFallback=0, clipped=0, intersections=0, viewportEscape=0, documentOverflow=0.

## 활성화 경계

현재 공개 제품은 계속 commit `399ac9df5b2d`, tree `89f98036255f`, asset `index-DG3dIvuW.js`, origin PID 62455와 tunnel PID 88741입니다. Builder는 어느 프로세스도 종료·재시작하지 않았고 공개 URL도 변경하지 않았습니다.

이 문서를 포함하는 candidate commit은 Planner가 exact commit을 isolated rebuild한 뒤 origin만 교체하고 기존 tunnel을 유지해야 합니다. 새 public receipt와 원격 36상태 검증 전에는 활성화 또는 fresh QA 준비 완료로 간주하지 않습니다.
