# Phase 2 · Registered Package Portfolio Foundation Brief

## User outcome

Cherry가 새 프로젝트를 OUTCOME Package로 등록하면 OUTCOME 코드를 프로젝트별로 고치지 않고도 기존 프로젝트들과 같은 구조로 전환·조회할 수 있다.

## Current evidence

- UI와 public snapshot은 이미 여러 `projects[]`를 순회하지만 collector 기본값은 Cherry Note와 OUTCOME 절대 경로 두 개로 고정돼 있다.
- 사용자 표시명은 알려진 source ID 번역표에 의존해, 임의의 세 번째 Package는 한글 fallback을 노출한다.
- 공개 projection과 read-only mutation boundary는 이미 있으며 반드시 보존한다.

## Minimal repair contract

1. Versioned `config/outcome-projects.json`과 project registry loader를 만든다. 정확한 shape은 `{"schema_version":1,"projects":[{"root":"../Cherry Note","contract_file":"OUTCOME_CONTRACT.md","map_file":"OUTCOME_MAP.md"}]}`이며, `root`는 OUTCOME repository root 기준 상대 경로 또는 runtime-only absolute path다. 기본 registry도 같은 loader를 통과하고 runtime override는 `OUTCOME_PROJECT_REGISTRY`의 명시적 파일 하나만 허용한다.
2. Registry entry는 Package root, Contract 상대 경로, Map 상대 경로를 선언한다. Contract/Map 절대 경로와 Package root 밖으로 나가는 상대 경로, 빈 projects, 중복 entry/project ID, malformed schema는 전체를 fail closed한다.
3. 기존 Package Map의 `title`과 `purpose`를 Project/Phase/Scope/Stage 사용자 표시 source metadata로 사용한다. 알려진 기존 ID는 현재 한글 표현을 transitional override로 보존하지만, 새 프로젝트 ID는 코드 번역표 없이 source title/purpose로 렌더한다.
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
