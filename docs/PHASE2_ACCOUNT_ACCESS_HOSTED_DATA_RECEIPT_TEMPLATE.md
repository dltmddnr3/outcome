# Phase 2 · 호스팅 데이터 미리보기 영수증 양식

상태: `TEMPLATE ONLY · NO SECRET OR PERSONAL VALUES · NO GATE CLOSURE`

이 양식은 HP1 P1-P6 완료와 별도 HP2 승인 뒤 실제 실행자가 비민감 사실만 기록할 때 사용한다. 템플릿 존재 자체는 D1-D7을 닫지 않는다.

## 1. 승인·선행 영수증

- HP1 완료: `[6/6 여부와 비민감 receipt 경로]`
- HP2 승인 참조: `[정확한 범위의 비민감 참조]`
- 승인 관측 시각: `[KST ISO-8601]`
- 허용: `isolated Supabase preview / synthetic data / Preview-only bindings`
- 미승인: `Production / real data / paid add-on / DNS·domain / release`

## 2. 불변 후보

- repository commit: `[40자리]`
- repository tree: `[40자리]`
- HP1 Preview receipt: `[commit/tree/asset]`
- migration file: `supabase/migrations/202608250001_account_access_foundation.sql`
- migration SHA-256: `[64자리]`
- Preview deployment: `[immutable HTTPS URL]`
- Production receipt unchanged: `[예/아니오]`

## 3. Supabase project 설정

- environment: `non-production isolated preview`
- region: `[ap-northeast-2 / 불일치]`
- plan: `[Free / 별도 승인 plan / 미확인]`
- active project quota checked: `[예/아니오]`
- projected cost category: `[0 / approved fixed / unknown]`
- paid add-on/PITR: `사용 안 함`
- organization members changed: `아니오`

organization ID, project ref, account email, database password와 connection string은 기록하지 않는다.

## 4. Clerk third-party auth

- integration type: `[first-class Clerk third-party auth / 실패]`
- deprecated JWT template: `사용 안 함`
- shared JWT secret: `사용 안 함`
- role claim: `[authenticated 확인 / 실패]`
- asymmetric issuer verification: `[통과/실패]`
- integration key refresh limitation acknowledged: `[예/아니오]`

Clerk domain, issuer URL, owner subject와 token claim 원문은 기록하지 않는다.

## 5. Migration·schema inventory

| 항목 | 기대 | 관측 |
| --- | ---: | ---: |
| migration | 1 | `[ ]` |
| table | 8 | `[ ]` |
| RLS enabled | 8 | `[ ]` |
| force RLS | 8 | `[ ]` |
| read policy | 6 | `[ ]` |
| anon/public grant | 0 | `[ ]` |
| authenticated write grant | 0 | `[ ]` |
| advisor security error | 0 | `[ ]` |

- exposed schema/profile configuration: `[확인/실패]`
- unexpected object count: `[0/건수]`

## 6. 합성 seed inventory

- real Package/user data rows: `0`
- synthetic workspace count: `[건수]`
- synthetic membership count: `[건수]`
- synthetic project/binding count: `[건수]`
- synthetic snapshot/receipt count: `[건수]`
- allowlisted Package: `cherry-note / outcome`
- source digest uniqueness: `[통과/실패]`

raw projection, subject, workspace/project ID와 digest 원문은 기록하지 않는다.

## 7. 인증·RLS 행렬

| 흐름 | HTTP/DB category | row count | 결과 |
| --- | --- | ---: | --- |
| owner allowed read | `[ ]` | `[ ]` | `[통과/실패/미실행]` |
| unauthenticated | `[ ]` | `0` | `[통과/실패/미실행]` |
| other owner | `[ ]` | `0` | `[통과/실패/미실행]` |
| forged workspace/project | `[ ]` | `0` | `[통과/실패/미실행]` |
| unregistered project | `[ ]` | `0` | `[통과/실패/미실행]` |
| revoked membership | `[ ]` | `0` | `[통과/실패/미실행]` |
| expired/revoked Clerk session | `[ ]` | `0` | `[통과/실패/미실행]` |
| authenticated INSERT | `[ ]` | `불변` | `[통과/실패/미실행]` |
| authenticated UPDATE | `[ ]` | `불변` | `[통과/실패/미실행]` |
| authenticated DELETE | `[ ]` | `불변` | `[통과/실패/미실행]` |
| anon schema/table probe | `[ ]` | `0` | `[통과/실패/미실행]` |

## 8. 수명주기·복원

- append-only snapshot: `[통과/실패/미실행]`
- current snapshot pointer: `[통과/실패/미실행]`
- prior snapshot preserved: `[통과/실패/미실행]`
- logical export created: `[통과/실패/미실행]`
- export prohibited-value hits: `[0/건수]`
- deletion access-first revoke: `[통과/실패/미실행]`
- restore mechanism: `[Free logical reapply / separately approved backup / 미실행]`
- restore schema/data/RLS parity: `[통과/실패/미실행]`
- daily backup/PITR claimed: `아니오`

## 9. Vercel Preview 환경 이름

값은 기록하지 않는다.

| 이름 | 대상 | 존재 | 값 기록 |
| --- | --- | --- | --- |
| `OUTCOME_SUPABASE_URL` | Preview | `[예/아니오]` | 금지 |
| `OUTCOME_SUPABASE_PUBLISHABLE_KEY` | Preview | `[예/아니오]` | 금지 |

- Supabase secret/service-role/database credential runtime env: `0`
- Production 환경값 생성·변경: `아니오`
- 환경 변경 뒤 새 immutable Preview: `[예/아니오]`

## 10. 공개·비공개 회귀

- MacBook private workspace: `[통과/실패/미실행]`
- mobile private workspace: `[통과/실패/미실행]`
- visible projects exactly two: `[예/아니오]`
- public page/API: `[HTTP 상태]`
- public mutations: `[405 건수/전체]`
- prohibited identifier hits: `[건수]`
- Production receipt unchanged: `[예/아니오]`
- completion authority: `false`

## 11. 되돌리기

- private surface disabled first: `[시각·결과]`
- Clerk sessions revoked: `[시각·결과]`
- two Preview env names removed: `[결과]`
- Supabase integration disabled: `[결과]`
- synthetic membership revoked: `[결과]`
- private denied/unavailable restored: `[결과]`
- public receipt/page/API/405/redaction restored: `[결과]`
- project state: `[preserved / paused after approval / deleted after separate approval]`

## 12. D1-D7 연결

- D1 separate HP2 approval: `[근거]`
- D2 isolated project·region·plan·cost: `[근거]`
- D3 Clerk integration·migration·RLS: `[근거]`
- D4 hosted deny matrix: `[근거]`
- D5 append/export/delete/restore: `[근거]`
- D6 MacBook/mobile workspace·public boundary: `[근거]`
- D7 exact candidate·receipt·rollback·limitations: `[근거]`

실패 또는 미실행 행이 하나라도 있으면 해당 Gate를 닫지 않는다.

## 기록 금지

- 이메일, 실명, 사진, 전화번호, account·organization·project 식별자
- Clerk subject/session/issuer/domain과 token/JWT/claim 원문
- Supabase project ref, URL 값, publishable/secret/service-role key 값
- database password, connection string, access token, cookie, 인증 코드
- 실제 Package projection, 로컬 절대 경로, session/thread/task/turn identifier
- Vercel environment 값, deployment credential과 비공개 callback parameter

위 값이 노출되면 기록을 중단하고 노출 표면을 폐기한다. key/session 철회·회전과 project 삭제는 각각 별도 승인 경계다.
