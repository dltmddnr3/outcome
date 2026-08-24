# Phase 2 · Registered Package Portfolio Foundation Brief

## User outcome

Cherry가 새 프로젝트를 OUTCOME Package로 등록하면 OUTCOME 코드를 프로젝트별로 고치지 않고도 기존 프로젝트들과 같은 구조로 전환·조회할 수 있다.

## Current evidence

- UI와 public snapshot은 이미 여러 `projects[]`를 순회하지만 collector 기본값은 Cherry Note와 OUTCOME 절대 경로 두 개로 고정돼 있다.
- 사용자 표시명은 알려진 source ID 번역표에 의존해, 임의의 세 번째 Package는 한글 fallback을 노출한다.
- 공개 projection과 read-only mutation boundary는 이미 있으며 반드시 보존한다.

## Minimal repair contract

1. Versioned project registry loader를 만든다. 기본 registry도 같은 loader를 통과하며 runtime override는 하나의 명시적 파일 경로만 허용한다.
2. Registry entry는 Package root, Contract 상대 경로, Map 상대 경로를 선언한다. 상대 경로 탈출, 중복 entry/project ID, malformed schema는 전체를 fail closed한다.
3. Package Map에 선택적 사용자 표시 metadata를 정의한다. 존재하면 Project/Phase/Scope/Stage 제목과 목적의 source authority이며, 없으면 기존 ID 매핑을 transitional fallback으로 유지한다.
4. 세 프로젝트 fixture로 collector·public projection·프로젝트 전환·모바일 1/4→4/4를 검증한다. fixture는 실제 제3 프로젝트 진행을 주장하지 않는다.
5. 공개 snapshot은 registry root/path/credential을 제거하고 기존 receipt, sanitizer, mutation denial을 그대로 유지한다.

## Preserve

- Project → Phase → Scope → Stage → Gate 의미
- NOW와 progress evidence 분리
- 현재 위치와 탐색 위치 분리
- 기존 Cherry Note와 OUTCOME 표현 및 Gate counts
- 고정 Vercel snapshot host와 새 배포 시 갱신 경계
- source-grounded 상태만 표시하고 종합 퍼센트·시간·완료를 추론하지 않음

## Non-goals

- 실제 Cherry Picker/NOL AX Package 등록
- 계정·로그인·프로젝트별 권한
- 다른 PC collector 또는 live session relay
- 프로젝트/세션 생성, 작업 dispatch, 승인, release
