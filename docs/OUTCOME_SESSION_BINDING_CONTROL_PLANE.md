# OUTCOME Package · Session Binding Control Plane

Status: **CHERRY-APPROVED PRODUCT DIRECTION / IMPLEMENTATION OPEN**

Observed: 2026-08-27 KST

## 문제와 결정

현재 OUTCOME은 세 층이 분리돼 있다.

1. `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md`, `GATES*.md`는 안정적인 프로젝트 결과 구조를 정의한다.
2. `server/phase3-private-session-registry.mjs`는 local synthetic 범위에서 project+role uniqueness, versioned replace/revoke와 audit을 증명했다.
3. 실제 대시보드는 `.outcome-runtime/bindings.json`을 직접 읽지만 Package 설치·세션 교체·history 저장과 연결되지 않아 과거 binding이 stale 상태로 남을 수 있다.

이 간극을 없애기 위해 OUTCOME Package는 기존 세 문서를 그대로 안정적 truth로 유지하면서 선택적 **operational companion**인 `OUTCOME_SESSIONS.md`를 추가한다. 이 파일은 네 역할 slot과 public-safe binding reference만 선언한다. raw provider locator와 실제 변화 이력의 canonical owner는 private runtime registry다.

## Source-grounded baseline

- 현재 synthetic `server/phase3-private-session-registry.mjs`가 증명한 mutation은 `bind`, `rebind`, `revoke`, `disable`이다. project+role active uniqueness, versioned replacement/revocation, append-only audit와 public-safe projection은 local synthetic 범위에서만 검증됐다.
- 이 계약의 `doctor`, `assign`, `replace`, `observe`, `checkpoint`와 persistent migration/CLI/UI는 아직 구현되지 않았다. 기존 `bind/rebind`를 새 이름의 live control plane으로 간주하지 않는다.
- 현재 `.outcome-runtime/bindings.json`은 `schema_version`이 없는 `bindings` object이며 네 role row와 stale observation, raw locator-shaped private field를 가진 historical input이다. 값은 Package/Git/public projection으로 복사하지 않고 migration 전 검증 대상으로만 취급한다.
- 현재 loader는 runtime file을 읽어 배열로 투영할 뿐 atomic persistence, history, migration receipt 또는 role completeness를 제공하지 않는다.

## Package 구성

| Artifact | 책임 | 변경 빈도 |
| --- | --- | --- |
| `OUTCOME_CONTRACT.md` | outcome, scope, acceptance authority | 낮음 |
| `OUTCOME_MAP.md` | Project → Phase → Scope → Stage | 낮음 |
| `GATES*.md` | Stage 완료 조건과 evidence | Gate 경계 |
| `OUTCOME_SESSIONS.md` | 네 역할 slot, public-safe active binding ref/version/state | binding 경계 |
| private registry | raw locator resolution, observation cursor, binding/event history | runtime |

`OUTCOME_SESSIONS.md`가 없는 기존 Package 전체를 invalid로 만들지 않는다. 구조와 Gate는 계속 읽되 role tracking은 `setup_required`, 각 역할은 `unbound`, NOW는 근거 없음으로 표시한다. 신규 OUTCOME Package 설치는 template에서 이 파일을 자동 생성한다.

## 고정 역할과 identity

각 프로젝트는 다음 네 role slot을 정확히 하나씩 가진다.

- `planner`: Project의 유일한 routing owner
- `builder`: 승인된 bounded implementation owner
- `ux_product_qa`: fresh independent usability/product verifier
- `release_audit`: separate fresh release verifier

표시 이름은 바뀔 수 있지만 role key는 바뀌지 않는다. provider task 제목이나 현재 대화 기억으로 role을 추정하지 않는다.

## Private registry schema

Private registry는 source control 밖의 권한 제한 파일 또는 향후 account-scoped database에 저장한다.

### Binding

- `binding_ref`: OUTCOME이 발급한 non-secret opaque identity
- `project_id`, `role`, `provider_class`
- `binding_version`: project+role 안에서 1부터 증가
- `status`: `active | idle | stale | rotating | blocked | replaced | revoked`
- `locator_ref`: raw provider locator를 직접 노출하지 않는 private reference
- `phase_id`, `scope_id`, `stage_id`
- `bound_at`, `observed_at`, optional `replaced_at`, `revoked_at`
- `predecessor_binding_ref`, optional `successor_binding_ref`
- `continuity_handoff_sha256`, optional `last_checkpoint_ref`

### Binding event

- `event_ref`, `project_id`, `role`
- `action`: `assign | replace | revoke | observe | checkpoint | block | recover`
- `before_version`, `after_version`
- `actor_class`, public-safe `reason_class`, `occurred_at`
- `handoff_sha256`, optional evidence receipt ref

이벤트는 append-only다. binding row를 삭제하거나 과거 event를 덮어써서 현재 상태를 만들지 않는다.

## 불변조건

- `(project_id, role)` active binding 최대 1개
- 모든 mutation은 `expected_version` compare-and-swap를 요구
- stale writer, duplicate active, cross-project, wrong-role, revoked/replaced target은 zero-partial fail closed
- binding state와 event append는 한 atomic commit 단위
- queued/running routing은 target binding version을 고정하며 replace 뒤 자동 승계·재전송하지 않음
- registry revision과 event sequence는 재시작 뒤에도 단조 증가
- private registry 손상·중복 active·history gap이면 `registry_conflict`이고 routing 정지

## 관리 동작

최소 control surface는 다음 여섯 동작이다.

- `doctor`: schema, file permission, role completeness, duplicate active, version/event continuity와 Package reference 검사
- `assign`: unbound role에 최초 binding 생성
- `replace`: verified successor로 CAS 교체하고 predecessor를 `replaced`로 보존
- `revoke`: active binding을 명시적으로 해제하고 role을 `unbound`로 전환
- `observe`: exact active binding의 availability, freshness, redacted NOW와 Stage placement 갱신
- `checkpoint`: content-addressed continuity handoff/receipt를 active binding에 연결

CLI나 admin UI가 raw locator를 argv, URL, 일반 log에 기록하지 않는다. locator 입력은 private file descriptor, stdin 또는 protected provider adapter를 사용한다. `doctor` 외 mutation은 actor, reason, expected version과 audit event가 없으면 거절한다.

## Planner와 root routing 보호

Planner는 다른 역할과 달리 project routing의 root owner다. Planner replacement는 다음 원자적 절차를 따른다.

1. 현재 Planner binding에 **routing freeze**를 걸어 새 dispatch를 차단한다.
2. `docs/SESSION_CONTINUITY_AND_ROTATION.md`의 durable handoff를 고정한다.
3. same-role successor가 source와 authority를 재검증하고 `STARTED`와 `CONTINUITY_READY`를 모두 반환한다.
4. `expected_version`으로 Planner binding을 **CAS replace**한다.
5. 새 version으로 routing owner가 바뀐 것을 read-after-write 검증한다.
6. 그 뒤에만 predecessor를 recoverable archive로 이동한다.

어느 단계든 timeout, `delivery_unknown`, hash drift 또는 successor `SAFE_HOLD`면 `rotation_failed`다. 기존 Planner는 active/recoverable 상태를 유지하고 queued work는 새 binding에 자동 승계하지 않는다. 이 규칙으로 루트 역할이 둘이 되거나 아무도 없는 상태를 방지한다.

## Persistence와 migration

초기 구현은 `.outcome-runtime/bindings.json`의 future `schema_version: 1` shape와 현재 관측된 versionless `{ bindings: [...] }` object를 read-only로 감지한다. 별도 legacy array variant를 지원하려면 RED fixture와 명시적 schema 판별을 먼저 추가하며 추정 coercion하지 않는다.

- migration 전 원본 byte SHA-256과 file mode를 receipt에 기록
- active라고 쓰였더라도 최신 observation 근거가 없으면 `stale`, 자동 활성화하지 않음
- v2 registry를 temp file에 완전히 쓰고 fsync/rename으로 원자 교체
- migration event와 각 role의 version/history를 생성
- validation 실패 시 원본을 보존하고 `registry_unavailable` 또는 `registry_conflict`
- migration 과정에서 Git, Package 문서, raw locator 또는 progress를 변경하지 않음

Persistence는 restart/crash 뒤 binding version, active uniqueness, event history와 checkpoint ref를 그대로 복구해야 한다. partial JSON, truncated event, temp file 잔존과 concurrent writer를 테스트한다.

## Package와 dashboard projection

대시보드는 선택 프로젝트에서 네 역할을 항상 같은 순서로 보여준다.

- 역할별 현재 연결: `active`, `idle`, `stale`, `rotating`, `blocked`, `unbound`, `setup_required`
- 마지막 관측 시각과 freshness
- public-safe binding version과 이력 수
- 연결된 Phase/Scope/Stage
- 현재 교체 중인지, predecessor history가 있는지

역할 행을 열면 current binding의 public-safe metadata와 append-only transition history를 볼 수 있다. UI와 `/api/dashboard`에는 raw provider locator, session/thread/task/turn ID, local path, credential과 full private receipt가 0건이어야 한다. public-safe projection은 `binding_ref`도 직접 노출하지 않고 version/history count와 상태만 제공한다.
Git과 Package 문서의 raw provider locator 및 private binding identifier도 0건이어야 하며, `OUTCOME_SESSIONS.md`에는 non-secret public-safe alias와 role slot만 허용한다.

## Source truth와 장애 처리

- Package manifest는 role slot을 선언한다.
- private registry는 current binding과 history의 runtime authority다.
- provider observation은 availability와 NOW만 갱신한다.
- `GATES*.md`와 immutable evidence만 progress/transition을 판정한다.

세션 activity는 NOW만 설명한다. assignment, 긴 작업시간, 메시지 수, animation 또는 session completion은 Gate 진행률이 아니다.

Fail-closed states:

- manifest missing: `setup_required`
- role missing: `unbound`
- registry read/permission/schema failure: `registry_unavailable`
- duplicate active/version/history conflict: `registry_conflict`
- provider observation stale: `stale`
- rotation pending: `rotating`
- successor verification failure: `blocked` or `rotation_failed`

## 현재 프로젝트 migration 원칙

OUTCOME의 현재 runtime binding 파일은 historical input으로만 migration한다. 실제 role assignment를 자동 추정하지 않는다.

- 현재 Planner는 verified current task일 때만 explicit `assign/replace` 대상
- Builder는 전담 Builder task receipt로 확인된 target만 지정
- UX & Product QA와 Release Audit은 fresh independent 작업 단위마다 explicit assignment하고 terminal 뒤 history로 남김
- Cherry Note는 별도 project root와 authority 아래에서 자체 `OUTCOME_SESSIONS.md`를 생성할 때까지 `setup_required`; OUTCOME이 Cherry Note product/source를 수정하지 않음

## Implementation slice

첫 Builder slice는 다음만 구현한다.

1. Package parser의 optional `sessions_file`과 `setup_required` projection
2. private v2 persistent registry와 v1 migration/atomic recovery
3. `doctor/assign/replace/revoke/observe/checkpoint` local CLI
4. runtime collector를 v2 registry public-safe projection에 연결
5. 네 role row의 version/history/setup/rotation 상태 표시와 history detail
6. package template/installer가 `OUTCOME_SESSIONS.md` 생성
7. unit, concurrency, crash recovery, redaction과 responsive UI tests

실제 provider 자동발견, task 생성, 메시지 dispatch, account DB, hosted mutation, deployment와 세션 archive/delete는 supported adapter와 별도 권한 전까지 금지한다.

## 완료 경계

이 control plane의 Builder PASS는 실제 역할 할당이나 live observation이 아니다. exact candidate 뒤 fresh UX & Product QA와 별도 Release Audit이 필요하다. 실제 current session assignment는 Cherry-approved private operation receipt로 별도 실행한다.

이 기능은 OUTCOME Package의 세션 tracking 기반일 뿐 Project/Phase/Scope/Stage/Gate progress, QA/Audit, Cherry acceptance, release 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
