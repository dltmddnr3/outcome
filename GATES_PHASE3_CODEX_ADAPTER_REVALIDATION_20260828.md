# OUTCOME Phase 3 · Codex Adapter Revalidation Gates

Outcome: 현재 설치된 Codex와 공식 App Server 계약을 다시 고정해 OUTCOME의 실제 existing-session observation/dispatch adapter가 production proof로 진입 가능한지, 아니면 기존 `NO_GO / UNBOUND_MANUAL_NAVIGATION`을 유지해야 하는지 판정한다.

- [x] V1: 현재 installed Codex version과 App Server surface를 read-only로 측정한다.
  EVIDENCE: `codex-cli 0.149.0-alpha.4`; stable schema 291 files / SHA-256 `7f45f287...f958b`; experimental 401 files / SHA-256 `5f6c5ea0...fed7`.
- [x] V2: official App Server 문서에서 thread read/list/resume, turn start와 lifecycle acknowledgement 의미를 재확인한다.
  EVIDENCE: official current App Server docs confirm initialize/initialized, stable thread/list+thread/read, separate resume/start, in-progress response and terminal turn/completed semantics.
- [x] V3: native project-role binding, idempotency, timeout retry, unattended host permission, rate/cost와 credential lifecycle의 지원 상태를 재판정한다.
  EVIDENCE: secure remote transport/auth is newly explicit, but native OUTCOME binding, turn/start idempotency, unattended/known-client/credential/cost operating contract remain unresolved; production relay stays NO_GO.
- [x] V4: 실제 session enumeration/read/message dispatch, credential access, private DB/UI scraping과 external mutation은 0이다.
  EVIDENCE: only CLI help, generated temporary schemas, official documentation and public-safe registry doctor/projection counts were read; actual provider/session operations and external mutations 0.
- [x] V5: GO/NO-GO와 다음 최소 Builder handoff가 source-grounded하며 O2/T1-T7 진행률을 변경하지 않는다.
  EVIDENCE: `docs/PHASE3_CODEX_ADAPTER_REVALIDATION_20260828.md` fixes production `NO_GO`, dispatch `LOCKED`, controlled read-only O2 proof `GO_PREPARED`; Phase 3 remains 17/43 with O2 and T1-T7 open.

PASS는 기술 재실사 판정만 의미한다. 실제 binding, observation, dispatch, O2, T1-T7, QA, Audit, Cherry acceptance, deploy와 release는 별도다.
