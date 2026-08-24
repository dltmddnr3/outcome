# NOL AX · OUTCOME Package 단일 설치 문서

문서 버전: `1.0`
OUTCOME Package schema: `1`
대상 프로젝트: `NOL AX`
고정 Project ID: `nol-ax`
최종 수용 권한: `Cherry`

이 파일 하나를 NOL AX를 작업할 다른 PC의 Codex에 첨부하고 아래 문장으로 시작합니다.

> 이 문서를 끝까지 읽고 `설치 실행 계약`에 따라 NOL AX 저장소에 OUTCOME Package를 설치해줘. 제품 코드는 수정하지 말고, Package 문서 검증과 역할 세션 준비까지만 진행해. 확인할 수 없는 프로젝트 목적·진행 상태·완료 증거는 추정하지 말고 정확한 blocker로 남겨줘.

이 문서에 적힌 명령과 템플릿은 실행 지시입니다. NOL AX 제품 요구사항 자체는 이 문서가 대신 결정하지 않습니다.

---

## 1. 설치 결과

설치가 정상적으로 끝나면 NOL AX 저장소에 다음 세 문서 유형이 생깁니다.

1. `OUTCOME_CONTRACT.md` — 프로젝트 Outcome, Phase 목적, 포함·제외 범위, 최종 수용 조건
2. `OUTCOME_MAP.md` — `Project → Phase → Scope → Stage` 구조, 목적, 순서, 의존성, Gate 연결
3. `GATES_NOL_AX.md` 또는 Stage별 `GATES_*.md` — 각 Stage를 넘기 위한 Gate의 `CHECK`, `EXPECT`, `EVIDENCE`

Gate는 Stage 다음에 오는 단계가 아닙니다. **Gate는 현재 Stage의 수용 조건**입니다. 작업 대화, commit 수, 코드 줄 수, 세션 활동량으로 진행률을 추정하지 않습니다.
관리 위계는 `Project → Phase → Scope → Stage → Gate`로 읽되, 마지막 Gate는 여정 단계가 아니라 선택한 Stage의 체크리스트로 해석합니다.

설치 후 역할은 다음 네 세션으로 분리합니다.

| 순서 | 역할 세션 | 소유 책임 | 제품 변경 권한 |
| 1 | NOL AX · Planner | Outcome Contract, Phase/Scope/Stage/Gate, 우선순위, 인계 결정 | 기획·Package 문서만 |
| 2 | NOL AX · Builder | 승인된 Stage 구현, 테스트, immutable candidate와 Builder evidence | 승인 범위 제품 코드 |
| 3 | NOL AX · UX & Product QA | fresh session으로 실제 사용성·제품 의미·반례 검수 | read/test/use only |
| 4 | NOL AX · Release Audit | 다른 fresh session으로 exact candidate·보안·빌드·rollback 감사 | read-only audit |

역할의 session ID와 교체 이력은 세 Package 문서에 넣지 않습니다. 그것은 프로젝트별 **OUTCOME runtime registry**에서 관리합니다.

---

## 2. 설치 실행 계약

설치 담당 Codex는 아래 순서를 지킵니다.

### 2.1 권한 경계

- NOL AX 저장소를 먼저 read-only로 조사합니다.
- 이 설치에서는 제품 코드, 데이터, 배포, 외부 서비스, 계정, 자격 증명을 변경하지 않습니다.
- GitHub remote 생성, push, branch 보호 변경은 Cherry의 별도 승인이 없으면 하지 않습니다.
- 기존 문서와 변경은 사용자 소유이므로 덮어쓰지 않습니다.
- `karpathy-guidelines`와 `unlazy`가 설치되어 있으면 읽고 적용합니다.
- 실질 문서 작업 전 설치 Gate를 파일로 만들고 실제 근거로 닫습니다.
- 확인하지 못한 상태는 `unknown`, 오래된 관측은 `stale`, 충돌은 `conflict`로 남깁니다.
- Builder 완료, 테스트 PASS, QA PASS, Release Audit PASS, Cherry acceptance, release는 서로 다른 상태입니다.
- `MVP_SCOPE_CLOSED`와 `EXTERNAL_OUTCOME_COMPLETE`를 분리하며 Cherry 결정 없이 참으로 만들지 않습니다.

### 2.2 저장소 확인

먼저 NOL AX 저장소 root에서 다음을 실행합니다.

```bash
pwd -P
git rev-parse --show-toplevel
git status --short
git remote -v
git branch --show-current
rg --files -g '!node_modules' -g '!vendor' -g '!build' -g '!dist' | sed -n '1,240p'
```

`git rev-parse --show-toplevel`이 실패하면 설치를 멈추고 `NOT_A_GIT_REPOSITORY`를 보고합니다. 새 저장소 초기화는 Cherry 승인 없이 하지 않습니다.

### 2.3 프로젝트 원본 조사

다음 원본을 우선순위대로 찾습니다.

1. 현재 README, PRD, roadmap, architecture, release scope
2. 현재 Git branch/commit과 실제 제품 구조
3. 열린 Gate, issue, task, handoff 문서
4. 테스트·빌드·QA·release evidence
5. 과거 채팅 요약 또는 자연어 완료 보고

검색 예시:

```bash
rg -n "outcome|목적|goal|phase|scope|stage|gate|acceptance|release|roadmap|milestone|current|next" \
  README* docs .github 2>/dev/null
```

낮은 우선순위의 완료 보고가 현재 Git·Gate·release 근거를 덮지 못합니다. NOL AX의 핵심 Outcome을 source로 확정할 수 없으면 제품 작업을 시작하지 말고 `NEEDS_CHERRY_OUTCOME_DEFINITION`으로 멈춥니다.

### 2.4 기존 변경 보호

- `git status --short` 결과를 설치 receipt에 기록합니다.
- 기존 `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md`, `GATES*.md`가 있으면 내용을 보존하고 KEEP/REPAIR/REMOVE 의견만 냅니다.
- 기존 파일을 교체해야 한다면 Cherry에게 먼저 승인을 요청합니다.
- 설치가 새 파일 추가로 끝나면 Package 파일만 stage 후보로 제시합니다. 자동 commit/push하지 않습니다.

---

## 3. NOL AX Package 작성 규칙

### 3.1 안정 ID

- Project: `nol-ax`
- Phase: `nol-ax-phase-<number-or-name>`
- Scope: `nol-ax-scope-<name>`
- Stage: `nol-ax-stage-<name>`
- Gate: Stage 파일 안에서 `G1`, `G2` 또는 의미 있는 대문자 code 사용
- ID는 소문자 영숫자와 하이픈만 사용하고 한 번 공개한 ID는 이름 변경과 별개로 유지합니다.

### 3.2 구조 의미

- Project: NOL AX가 최종적으로 만들어야 하는 사용자 결과
- Phase: 독립적으로 수용 가능한 큰 결과 경계
- Scope: Phase 안에서 함께 관리할 제품 결과 묶음
- Stage: Builder → QA/Audit로 인계 가능한 검증 단위
- Gate: 해당 Stage를 통과하기 위한 이진 수용 조건

Phase, Scope, Stage에는 반드시 `purpose`가 있어야 합니다. Stage 순서는 배열 순서와 `depends_on`으로 명시합니다.

### 3.3 진행 상태

- `implementation_state`: 구현 근거
- `test_state`: 테스트 근거
- `evidence_closure_state`: immutable evidence 확정
- `independent_qa_state`: fresh UX/Product QA
- `release_state`: separate Release Audit
- `cherry_acceptance_state`: Cherry 명시적 수용

한 축의 완료가 다른 축을 자동 완료시키지 않습니다. 종합 진행률은 만들지 않습니다. 현재 Stage의 Gate `closed/total`만 표시할 수 있습니다.

---

## 4. 생성할 `OUTCOME_CONTRACT.md` 템플릿

아래 템플릿을 NOL AX 원본 근거로 모두 채웁니다. 대괄호 placeholder가 하나라도 남으면 Status는 `DRAFT`이며 Builder를 시작하지 않습니다.

````markdown
# NOL AX Outcome Contract

Updated: [YYYY-MM-DD timezone]
Status: **DRAFT | CHERRY APPROVED**

## Package identity

- Package name: `OUTCOME Package`
- Package schema version: `1`
- Project ID: `nol-ax`
- Project name: `NOL AX`
- Outcome: [NOL AX 사용자가 얻게 될 검증 가능한 결과]
- Acceptance authority: `Cherry`
- Required Package files:
  - `OUTCOME_CONTRACT.md`
  - `OUTCOME_MAP.md`
  - `GATES_NOL_AX.md`

## Source connector contract

- GitHub connector: [connected owner/repo origin/main | unbound | not adopted]
- GitHub activity has `completion_authority=false`.
- Tokens, credentials, local absolute paths and session IDs remain runtime-only.
- Local Git candidate, published commit, checks, release and Cherry acceptance are separate evidence.

## Phase contract

- Phase ID: `[nol-ax-phase-*]`
- Phase name: [name]
- Purpose: [이 Phase가 만드는 사용자/사업/제품 결과]
- Entry condition: [시작 가능한 근거]
- Completion conditions:
  - [검증 가능한 조건]
- Included:
  - [scope]
- Excluded:
  - [explicit non-goal]

## User and problem

- Primary user: [source-grounded user]
- Problem: [한 문장]
- 30-second orientation task: Cherry가 현재 Phase/Scope/Stage, 남은 Gate와 다음 행동을 설명할 수 있다.

## Final acceptance axes

- Functional outcome: [expected behavior]
- UX and product outcome: [actual-use outcome]
- Real-use outcome: [real environment evidence]
- Independent QA requirement: Builder와 다른 fresh UX & Product QA가 exact candidate를 검증한다.
- Release audit requirement: QA PASS 뒤 다른 fresh Release Audit이 동일 candidate를 검증한다.
- Cherry acceptance requirement: Cherry의 명시적 수용이 필요하다.
- Release authority: 별도 Cherry 승인 전 deploy/release/external mutation을 수행하지 않는다.

## Completion boundary

- `MVP_SCOPE_CLOSED`: false
- `EXTERNAL_OUTCOME_COMPLETE`: false
- 테스트, 문서, 빌드 또는 자연어 완료 보고 하나만으로 위 값을 바꾸지 않는다.
````

---

## 5. 생성할 `OUTCOME_MAP.md` 템플릿

Phase/Scope/Stage 개수는 NOL AX 원본에 맞게 늘리거나 줄입니다. 예시 개수를 실제 진행으로 오해하지 않습니다.

````markdown
# NOL AX Outcome Map

Contract status: **DRAFT | APPROVED**
Updated: [YYYY-MM-DD timezone]

이 문서는 Project → Phase → Scope → Stage 구조를 정의합니다. 진행은 연결된 Gate evidence에서만 판정합니다.

```yaml
project_id: nol-ax
project_title: NOL AX
package_name: OUTCOME Package
package_schema_version: 1
project_purpose: >-
  [OUTCOME_CONTRACT.md의 Outcome과 같은 의미]
contract_file: OUTCOME_CONTRACT.md
gates_files:
  - GATES_NOL_AX.md
runtime_binding_source: OUTCOME-managed registry
source_connectors:
  github:
    adopted: false
    required: false
    repository: null
    remote_name: origin
    default_branch: main
    binding_state: unbound
    observed_published_state: unknown
    completion_authority: false

phases:
  - id: nol-ax-phase-1
    title: [Phase title]
    purpose: >-
      [Phase purpose]
    completion: >-
      [Phase completion boundary]
    scopes:
      - id: nol-ax-scope-1
        title: [Scope title]
        purpose: [Scope purpose]
        included:
          - [included result]
        excluded:
          - [excluded result]
        stages:
          - id: nol-ax-stage-1
            title: [Stage title]
            purpose: [Stage purpose]
            depends_on: []
            gates_file: GATES_NOL_AX.md#G1-G3
            implementation_state: pending
            test_state: pending
            evidence_closure_state: pending
            independent_qa_state: pending
            release_state: pending
            cherry_acceptance_state: pending
          - id: nol-ax-stage-2
            title: Independent UX and product QA
            purpose: Builder와 분리된 fresh session이 실제 사용자 Outcome과 반례를 검증한다.
            depends_on: [nol-ax-stage-1]
            gates_file: GATES_NOL_AX.md#Q1-Q1
            evidence_closure_state: pending
            independent_qa_state: pending
          - id: nol-ax-stage-3
            title: Independent release audit
            purpose: QA와 다른 fresh session이 exact candidate의 보안·빌드·runtime·rollback을 감사한다.
            depends_on: [nol-ax-stage-2]
            gates_file: GATES_NOL_AX.md#A1-A1
            evidence_closure_state: pending
            release_state: pending
          - id: nol-ax-stage-4
            title: Cherry acceptance
            purpose: Cherry가 실제 결과와 scope closure를 명시적으로 결정한다.
            depends_on: [nol-ax-stage-3]
            gates_file: GATES_NOL_AX.md#C1-C2
            cherry_acceptance_state: pending
```

## 현재 위치

- Current: `nol-ax-phase-1 / nol-ax-scope-1 / nol-ax-stage-1 · [title]`
- Next: `[next stage ID · title | owner-only decision | no source]`
- Blocker: `[none | exact source-grounded blocker]`
- `MVP_SCOPE_CLOSED`: false
- `EXTERNAL_OUTCOME_COMPLETE`: false
````

GitHub remote가 이미 존재하고 실제 `owner/repo`가 확인된 경우에만 다음처럼 바꿉니다.

```yaml
adopted: true
repository: owner/repo
binding_state: connected
```

remote가 없으면 `unbound`를 유지합니다. 이 설치 과정에서 GitHub 저장소를 만들거나 push하지 않습니다.

---

## 6. 생성할 `GATES_NOL_AX.md` 템플릿

Gate는 사용자 결과를 판정할 수 있는 조건이어야 합니다. “코드 작성”, “작업 시작”, “세션 생성”만으로 제품 Stage Gate를 닫지 않습니다.

````markdown
# NOL AX Stage Gates

Project ID: `nol-ax`
Status: `OPEN`

## [Stage title]

Stage ID: `nol-ax-stage-1`

Outcome: [이 Stage가 증명할 제품 결과]

- [ ] G1: [검증 가능한 수용 조건]
  PROVES: implementation
  CHECK: [안전한 read-only 검사 명령 또는 manual]
  EXPECT: [정확한 통과 결과]
  EVIDENCE: pending
- [ ] G2: [회귀와 실패 상태를 포함한 테스트 조건]
  PROVES: test
  CHECK: [test command]
  EXPECT: exit 0 and [exact count/condition]
  EVIDENCE: pending
- [ ] G3: exact candidate commit/tree와 변경 경로가 고정되고 Builder self-acceptance와 분리된다.
  PROVES: evidence
  CHECK: git status --short && git rev-parse HEAD && git rev-parse HEAD^{tree}
  EXPECT: exact candidate identity and scoped paths recorded
  EVIDENCE: pending

## Independent UX & Product QA

- [ ] Q1: fresh QA가 exact candidate의 사용자 Outcome과 반례를 독립 검증한다.
  PROVES: ux_product_qa
  EVIDENCE: pending

## Release Audit

- [ ] A1: QA와 다른 fresh session이 동일 candidate의 build, security, runtime, rollback을 감사한다.
  PROVES: release_audit
  EVIDENCE: pending

## Cherry acceptance

- [ ] C1: Cherry가 실제 결과를 사용하고 현재 위치와 다음 행동을 수용한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending
- [ ] C2: Cherry가 scope closure와 release를 별도 결정한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

완료는 모든 필수 Gate에 실제 evidence가 있거나 명시적 `ABANDON: <gate> <reason>`이 있을 때만 주장할 수 있습니다.
````

---

## 7. Package 검증

세 파일을 만든 뒤 NOL AX 저장소 root에서 실행합니다.

```bash
set -eu

test -s OUTCOME_CONTRACT.md
test -s OUTCOME_MAP.md
test -s GATES_NOL_AX.md

rg -q 'Project ID: `nol-ax`' OUTCOME_CONTRACT.md
rg -q 'Project name: `NOL AX`' OUTCOME_CONTRACT.md
rg -q 'Acceptance authority: `Cherry`' OUTCOME_CONTRACT.md
rg -q '^project_id: nol-ax$' OUTCOME_MAP.md
rg -q '^package_schema_version: 1$' OUTCOME_MAP.md
rg -q 'runtime_binding_source: OUTCOME-managed registry' OUTCOME_MAP.md
rg -q 'completion_authority: false' OUTCOME_MAP.md
rg -q 'gates_file: GATES_NOL_AX.md' OUTCOME_MAP.md
rg -q '^Stage ID: `nol-ax-stage-' GATES_NOL_AX.md
rg -q 'PROVES:' GATES_NOL_AX.md
rg -q 'EVIDENCE:' GATES_NOL_AX.md

if rg -n '\[[A-Za-z가-힣][^]]*\]|TBD|TODO|placeholder' OUTCOME_CONTRACT.md OUTCOME_MAP.md GATES_NOL_AX.md; then
  echo 'PACKAGE_DRAFT_PLACEHOLDERS_REMAIN'
  exit 1
fi

echo 'PACKAGE_VALID'
```

추가 의미 검증:

- Contract Outcome과 Map `project_purpose`가 같은 결과를 말하는지 확인합니다.
- Map의 모든 `gates_file`이 실제 파일과 anchor를 가리키는지 확인합니다.
- 모든 ID가 중복 없이 소문자 영숫자·하이픈만 사용하는지 확인합니다.
- `Current`가 실제 존재하는 Stage를 가리키는지 확인합니다.
- 완료 체크된 Gate는 `pending`이 아닌 실제 `EVIDENCE`를 가져야 합니다.
- Stage Gate가 전부 닫혔더라도 evidence/QA/Audit/Cherry 축이 열려 있으면 전체 완료로 표시하지 않습니다.

검증 실패 시 Package는 `unknown` 또는 `conflict`입니다. 대화 내용으로 빈 값을 보간하지 않습니다.

---

## 8. 역할 세션 생성과 binding

Package가 `PACKAGE_VALID`를 통과한 다음에만 역할 세션을 준비합니다.

### 8.1 Planner

먼저 `NOL AX · Planner`를 생성합니다. Planner는 세 Package 문서를 읽고 다음 한 Stage만 Builder에게 전달합니다. 제품 코드를 직접 수정하지 않습니다.

### 8.2 Builder

Planner가 승인한 Stage contract, allowed paths, Gate, test, 금지 범위를 상속받은 `NOL AX · Builder`를 생성합니다. Builder는 하나의 bounded candidate를 만들고 self-accept하지 않습니다.

### 8.3 UX & Product QA

Builder candidate가 commit/tree로 고정된 뒤 새 `NOL AX · UX & Product QA` 세션을 사용합니다. Builder의 reasoning이나 세션을 재사용하지 않습니다.

### 8.4 Release Audit

QA PASS 뒤 그 QA와 다른 새 `NOL AX · Release Audit` 세션을 사용합니다. QA PASS를 release PASS로 대체하지 않습니다.

각 세션 생성 후 아래 binding receipt를 설치 결과로 출력합니다. Package 파일에는 쓰지 않습니다.

```yaml
project_id: nol-ax
role: planner | builder | ux_product_qa | release_audit
session_id: [actual session ID]
host_id: [actual host ID | unknown]
worktree_root: [actual root | unknown]
phase_id: [actual phase ID | null]
scope_id: [actual scope ID | null]
stage_id: [actual stage ID | null]
bound_at: [ISO timestamp]
replaced_at: null
status: active | idle | terminal | stale | replaced | unbound
```

세션이 교체되면 이전 record를 삭제하지 않고 `replaced`와 `replaced_at`을 남깁니다. 세션 활동은 NOW 설명에만 사용하고 Gate 진행 증거로 사용하지 않습니다.

---

## 9. Git과 외부 변경 경계

기본 설치 허용 범위는 로컬 문서 작성과 read-only 검증입니다.

별도 Cherry 승인 전 금지:

- `git push`, PR 생성·merge
- 배포, release, package publish
- GitHub 저장소 생성 또는 visibility 변경
- credential·token·SSH key 변경
- 외부 서비스·데이터 mutation
- NOL AX 제품 코드 변경

로컬 commit도 자동으로 만들지 않습니다. 설치 담당자는 변경 파일과 `git diff --check` 결과를 먼저 보여주고 Cherry 또는 상위 Planner의 승인을 기다립니다.

---

## 10. 현재 OUTCOME 중앙 대시보드 연결 경계

이 문서로 **NOL AX 저장소의 OUTCOME Package와 역할 운영 계약**은 설치할 수 있습니다. 그러나 현재 OUTCOME 공개 대시보드 collector는 Mac Mini의 Cherry Note와 OUTCOME 두 로컬 root가 코드에 **하드코딩**되어 있습니다.

따라서 다른 PC에서 Package를 설치한 직후의 정직한 상태는 다음과 같습니다.

```text
PACKAGE_READY_NOT_DASHBOARD_BOUND
```

다음 중 하나가 별도 구현·검증되어야 중앙 대시보드에 NOL AX가 나타납니다.

1. Mac Mini가 읽을 수 있는 NOL AX canonical checkout을 만들고, OUTCOME collector에 configurable validated Package root로 등록
2. GitHub의 Package 문서와 evidence를 read-only로 수집하는 multi-PC connector 구현
3. 향후 계정 기반 OUTCOME service에서 host/project registry 제공

이 연결 작업은 본 문서 설치 범위가 아닙니다. 현재 하드코딩된 `server/outcome-package.mjs`에 임의 경로를 직접 추가하고 완료라고 주장하지 않습니다. 중앙 대시보드 등록은 별도 Builder candidate, 독립 QA, Release Audit을 거쳐야 합니다.

---

## 11. 설치 완료 receipt

설치 담당 Codex는 마지막에 아래 형식만 채워 보고합니다. 확인하지 못한 값은 `unknown`으로 둡니다.

```yaml
project_id: nol-ax
package_schema_version: 1
repository_root: [observed root]
git_head: [short commit | unborn | unknown]
working_tree_before: [clean | dirty with exact paths]
package_files:
  contract: OUTCOME_CONTRACT.md
  map: OUTCOME_MAP.md
  gates:
    - GATES_NOL_AX.md
package_validation: PACKAGE_VALID | PACKAGE_DRAFT_PLACEHOLDERS_REMAIN | FAIL
contract_status: DRAFT | CHERRY_APPROVED
current_boundary: [phase / scope / stage | unknown]
next_boundary: [stage | owner decision | unknown]
github_connector: connected | unbound | conflict | not_adopted
role_bindings:
  planner: [session ID | unbound]
  builder: [session ID | unbound]
  ux_product_qa: [session ID | unbound]
  release_audit: [session ID | unbound]
dashboard_binding: PACKAGE_READY_NOT_DASHBOARD_BOUND | BOUND_AND_VERIFIED
checks: [N/N]
blockers:
  - [exact blocker | none]
needs_cherry_decision:
  - [decision | none]
false_completion_count: 0
next_safe_action: [one action]
```

`package_validation=PACKAGE_VALID`은 제품 완료가 아닙니다. `dashboard_binding=BOUND_AND_VERIFIED`도 QA, Release Audit, Cherry acceptance 또는 release를 대신하지 않습니다.

---

## 12. 설치 성공 정의

다음 조건이 모두 만족될 때만 이 단일 문서의 설치 작업이 완료됩니다.

- NOL AX 원본을 읽고 Project Outcome과 현재 경계를 source-grounded하게 작성했습니다.
- 세 Package 문서 유형이 유효하고 placeholder가 없습니다.
- Phase/Scope/Stage 목적과 Stage별 Gate가 연결됩니다.
- 역할 네 세션의 실제 ID가 project-scoped binding receipt로 남습니다.
- GitHub와 dashboard binding 상태가 실제 관측과 일치합니다.
- 제품 코드·배포·외부 mutation이 없습니다.
- 남은 중앙 dashboard 연결 한계가 `PACKAGE_READY_NOT_DASHBOARD_BOUND`로 명시됩니다.
- 구현, 테스트, evidence, QA, Audit, Cherry acceptance, release가 합쳐지지 않습니다.

이 중 하나라도 충족되지 않으면 완료 보고 대신 정확한 blocker와 다음 한 가지 안전한 행동을 남깁니다.
