# Phase 2 · Hosted Identity Preview Gates

Outcome: Cherry가 승인한 개발 환경에서 정확히 한 명의 canonical owner가 Google·email code로 로그인하고 Apple을 연결한 뒤 MacBook/mobile에서 로그인·로그아웃·거부·복구를 직접 검수한다.

- [ ] P1: Cherry가 HP1의 정확한 외부 변경 범위를 명시적으로 승인한다.
  PROVES: cherry_decision
  EVIDENCE: pending
- [ ] P2: 클러크 개발 환경이 초대 전용·단일 소유자·조직 및 임의 가입 없음으로 생성되고 민감정보를 가린 영수증이 고정된다.
  PROVES: security
  EVIDENCE: pending
- [ ] P3: 구글 공용 개발 로그인, 이메일 코드 대체 경로, 인증 후 애플 연결만 허용, 다른 사용자 거부와 권한 철회가 직접 검증된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] P4: 버셀 미리보기 전용 연결값과 변경 불가 미리보기 배포가 생성되고 운영 주소와 설정은 비활성 상태를 유지한다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] P5: 맥북과 모바일 시스템 브라우저에서 로그인·불러오는 중·준비·로그아웃·만료·철회·인증 제공자 장애 흐름이 실측된다.
  PROVES: test
  EVIDENCE: pending
- [ ] P6: 정확한 미리보기 후보, 인증 제공자·설정 이름, 민감정보를 가린 영수증, 비용, 되돌리기와 한계가 기록되고 HP2 외부 변경은 별도로 열려 있다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Supabase resource, production Clerk/Google/Apple credentials, paid plan, production env, custom domain/DNS, public release, Phase completion과 `EXTERNAL_OUTCOME_COMPLETE`는 HP1 범위가 아니다.
