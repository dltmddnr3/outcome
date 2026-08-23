# OUTCOME Roadmap

## MVP · Cherry Note 단일 프로젝트

목표는 대시보드 형태를 잡고, Cherry Note의 실제 Codex 근거를 실시간으로 이해 가능한 화면으로 제공하는 것입니다.

1. 독립 저장소 계약과 source boundary 확정
2. 기존 dashboard 전용 코드의 surgical extraction
3. source adapter / domain model / presentation 분리
4. 현재 상태·속도·freshness·충돌 표시
5. Project → Phase → Scope → Stage와 Gate 의미 확정
6. 데스크톱·모바일 사용성 검증
7. fresh Claude UX/Product QA
8. separate fresh Claude Release Audit
9. Cherry acceptance

MVP에서는 Cherry Note 제품을 변경하거나 작업을 dispatch하지 않습니다.

## Phase 2 · 포트폴리오

새 Outcome Contract 후 시작합니다.

- 여러 프로젝트 전체 현황
- 프로젝트별 drill-down
- 여러 Codex 계정과 다른 PC의 session evidence
- CLI-only 프로젝트의 live activity
- 계정/provider capacity와 hold/priority 판단
- Slack 또는 별도 remote ingress와의 연결

## Phase 3 · 운영 서비스

- hosted access와 계정 로그인
- durable database와 cross-device sync
- project/source connector registry
- role/account/session routing visibility
- notification, approval, incident history
- 결과 도달 패턴과 병목 분석

## 후속 Phase로 미루는 기준

기능이 흥미로운지가 아니라, Cherry Note 단일 프로젝트의 30초 이해 과업에 필수인지로 판단합니다. 다음에 해당하면 후속으로 보냅니다.

- 두 번째 프로젝트가 있어야만 검증 가능한 기능
- 원격 mutation 또는 credential이 필요한 기능
- 대시보드의 source truth보다 작업 dispatch가 중심인 기능
- 현재 MVP 화면 이해도를 높이지 않는 설정·관리 기능

