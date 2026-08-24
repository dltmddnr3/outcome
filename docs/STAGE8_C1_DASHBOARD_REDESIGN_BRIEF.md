# OUTCOME Stage 8 C1 진행 구조 재구성 Brief

관측일: 2026-08-24 KST

## 사용자 목표

Cherry가 첫 화면에서 프로젝트 이름, 활성 세션, 현재 위치와 다음 경계를 먼저 이해하고, 필요할 때만 기술 증거를 펼쳐 본다. 기존 버전의 강한 프로젝트 컨테이너·라임 진행 표현·실시간 애니메이션·Scope 상태 표현과 현재 버전의 NOW·역할별 세션 카드를 하나의 정보 흐름으로 결합한다.

## 핵심 원칙

- 프로젝트 전체의 추정 진행률이나 합성 퍼센트는 만들지 않는다.
- 화면 상단은 결과와 현재 위치, 중단은 세션 활동, 본문은 `큰 단계 → 범위 → 작업 단계 → 완료 조건`의 source-grounded funnel 순서다.
- 라임은 현재/실시간에만 사용하고 완료·진행 중·대기는 아이콘과 한글 상태를 함께 표시한다.
- build receipt와 GitHub connector는 삭제하지 않고 기본 접힘 상태의 `기술 증거`로 내린다.
- 선택한 과거 작업 단계의 상세와 실제 현재 위치를 혼동하지 않도록 현재 funnel과 탐색 상세를 분리한다.

## 데스크톱 정보 구조

1. 프로젝트 전환
2. 프로젝트 Hero
   - 기존의 일반 문구 대신 선택 프로젝트 이름·Outcome·현재 위치·다음 경계
   - 프로젝트 아이콘, source freshness, 새로고침
   - 배경 라임 진행 fill은 `현재 작업 단계 완료 조건 closed / total`만 사용하고 같은 의미를 한글로 명시
   - Gate 원본이 없으면 fill을 만들지 않고 `완료 조건 근거 없음` 표시
3. 실시간 작업
   - NOW 설명과 네 역할 카드를 유지
   - 실제 active + fresh binding 카드 한 개만 라임 glow와 live bar 애니메이션
   - stale/unbound/unknown은 정적 상태, 색 외 한글 label 필수
4. 진행 Funnel
   - `큰 단계 i / total` — 현재 큰 단계 목적
   - `범위 i / total` — 현재 큰 단계에 속한 범위 rail과 완료/진행 중/대기
   - `작업 단계 i / total` — 현재 범위에 속한 작업 단계 rail
   - `완료 조건 closed / total` — 현재 작업 단계가 넘어가기 위해 남은 조건
   - 네 행은 아래로 갈수록 들여쓰기와 강조 폭이 줄어 실제 funnel 방향이 보이게 구성
5. 현재 작업 단계와 탐색 상세
   - 현재 조건 3개를 우선 표시
   - 다른 작업 단계를 선택하면 `탐색 중` 표식을 붙이고 현재 위치와 분리
6. 기술 증거
   - 기본 접힘
   - 제공 중인 build commit/tree/asset, GitHub connector, 근거축

## 모바일 순서

`프로젝트 전환 → 프로젝트 Hero → NOW → 역할 카드 → 큰 단계 → 범위 → 작업 단계 → 완료 조건 → 현재 상세 → 기술 증거`

- 390×844에서 가로 rail은 줄바꿈 또는 세로 stepper로 전환한다.
- 핵심 현재 위치와 다음 조건은 첫 두 viewport 안에서 찾을 수 있어야 한다.
- 기술 증거는 사용자 진행 파악을 밀어내지 않는다.

## Source-grounded 상태 의미

- 큰 단계: `project.phases`의 개수와 `current.phaseId`의 실제 index.
- 범위: 현재 Phase의 `scopes` 개수와 `current.scopeId`의 실제 index.
- 작업 단계: 현재 Scope의 `stages` 개수와 `current.stageId`의 실제 index.
- 완료 조건: 현재 Stage의 Gate `closed / total`.
- Scope 완료: 모든 자식 Stage가 source state `complete`일 때만 완료.
- Scope 진행 중: 실제 current Scope일 때만 진행 중.
- 그 외는 대기/근거 없음으로 fail closed.
- Hero fill은 현재 Stage Gate evidence만 반영하며 프로젝트 전체 진척으로 표현하지 않는다.

## Motion

- 활성 세션 카드: 정적 라임 outline + pseudo-element opacity glow, 1.8–2.4초 주기.
- live indicator: 3개 막대의 transform scaleY 또는 dot opacity, 실제 active binding일 때만 동작.
- 진행 fill: 값 변경 시 transform scaleX 200–300ms.
- 동시에 움직이는 의미 요소는 활성 카드와 live indicator 두 개로 제한한다.
- `prefers-reduced-motion: reduce`에서는 모든 반복 animation을 제거하고 정적 outline/dot으로 대체한다.

## 유지 경계

- OUTCOME Package 원본 키·ID·진행 의미는 변경하지 않는다.
- C1/C2, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 Cherry 결정 전 닫지 않는다.
- Cherry Note iOS, Desk/Slack/provider/relay, historical QA/Audit는 변경하지 않는다.
- 사용자 소유 `docs/ROADMAP 2.md`는 열거나 수정하거나 커밋하지 않는다.
