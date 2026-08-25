# Phase 2 · 호스팅 데이터 미리보기 실행 절차

상태: `PREFLIGHT ONLY · HP1 EVIDENCE + HP2 APPROVAL REQUIRED · NO_EXTERNAL_MUTATION`

이 문서는 HP1 hosted identity P1-P6가 실제 증거로 모두 닫히고 Cherry가 HP2의 정확한 외부 변경 범위를 별도로 승인한 뒤에만 사용한다. 현재 문서 준비는 Supabase 조직·프로젝트·branch·database·integration·key·환경값·배포 또는 데이터를 생성·변경하지 않는다.

## 실행 입력

- 코드 기준선 관측: `9cbf834196e3982a7822c422a9a9b18a74d66692`
- 코드 기준 트리: `d33a2cf61157c369e4121f4e38fd3ada97a24038`
- migration: `supabase/migrations/202608250001_account_access_foundation.sql`
- migration SHA-256: `832e8fc117d7c5b1b403cbe8f4e34ca3f4ceeb3f23904c82daefd56b96cae5a7`
- migration 계약: private schema `outcome_private`, table 8개, 각 table RLS·force RLS 8개, authenticated read policy 6개, anon/public grant 없음
- 런타임 데이터 환경 이름:
  - `OUTCOME_SUPABASE_URL`
  - `OUTCOME_SUPABASE_PUBLISHABLE_KEY`
- 런타임 금지 환경 이름: Supabase secret/service-role/database password/connection string
- 실행 직전 재고정: `HEAD=origin/main`, HP1 exact Preview deployment, migration SHA, 공개 Production receipt와 D1-D7 `0/7`을 새 영수증에 기록한다.

문서의 코드 기준선은 사전점검 관측값이다. HP2 실행 후보는 D1 승인 직후 새 `HEAD=origin/main`과 HP1 immutable Preview를 다시 고정하며, 불일치하면 실행하지 않는다.

## 선행 조건

다음 조건이 모두 충족되기 전에는 Supabase 외부 변경을 시작하지 않는다.

1. HP1 P1-P6가 실제 Clerk Development·Preview·MacBook/mobile 증거로 `6/6` 닫혔다.
2. Cherry가 HP2 isolated Supabase Preview의 정확한 외부 변경 문구를 별도로 승인했다.
3. 정확한 migration SHA와 HP1 Preview commit/tree/asset/URL이 일치한다.
4. 프로젝트 생성 전 요금제·예상 비용·활성 Free project quota와 `ap-northeast-2` 가용성을 읽기 전용으로 확인했다.
5. 영수증 양식 `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_RECEIPT_TEMPLATE.md`가 준비됐다.
6. Production·실데이터·운영 인증·도메인·출시가 HP2 범위가 아님을 다시 확인했다.

## 허용된 외부 변경

정확한 HP2 승인 후에도 다음 작업만 순서대로 허용한다.

- 승인된 Supabase 조직 안에 비운영 isolated project 하나를 만든다.
- exact region `ap-northeast-2`(Seoul)를 선택한다. 생성 화면에서 사용할 수 없으면 다른 지역으로 대체하지 않고 중단한다.
- 승인 문구가 Free를 지정하면 Free만 사용한다. 유료 plan·compute·PITR·add-on 또는 비용 확인 화면이 나타나면 새 비용 승인을 받기 전 중단한다.
- Clerk의 현재 Development instance를 Supabase first-class `third-party auth`로 연결한다. deprecated JWT template 또는 공유 JWT secret 방식은 사용하지 않는다.
- exact migration 한 개만 적용하고 migration 목록·SHA·schema·grant·RLS·policy·advisor 결과를 확인한다.
- 실제 프로젝트 내용이 없는 합성 workspace 2개, owner subject 2개, Package project 2개 이상, append-only snapshot과 deployment receipt만 seed한다.
- HP1 owner subject에 해당하는 합성 workspace에는 허용 Package `cherry-note`, `outcome`만 연결한다.
- 아래 두 이름만 Vercel `Preview`에 추가한다. 값은 Git·문서·Gate·메시지·스크린샷에 기록하지 않는다.
  - `OUTCOME_SUPABASE_URL`
  - `OUTCOME_SUPABASE_PUBLISHABLE_KEY`
- 환경 변경 뒤 새 immutable Preview 배포 하나를 생성하고 HP1 Preview와 동일한 Clerk/session 경계를 사용해 실제 RLS를 검증한다.
- Free plan에서는 logical schema/data export와 깨끗한 격리 재적용으로 restore rehearsal을 수행한다. 유료 daily backup/PITR을 사용했다고 표시하지 않는다.

## 금지된 외부 변경

- Supabase Production 용도 조직·프로젝트·branch 또는 기존 프로젝트 변경
- Vercel Production 환경값·Production 배포·alias·domain·DNS 변경
- 실제 OUTCOME/Cherry Note Package 원문, 사용자 작업 내용, 로컬 경로, 세션·thread·task 정보 또는 개인 데이터 업로드
- Supabase secret key, legacy service-role key, database password, connection string을 브라우저 bundle·Vercel runtime env·Git·문서·로그에 보존
- deprecated Clerk JWT template, 공유 JWT secret, Supabase Auth 사용자 이관 또는 두 번째 실제 사용자 생성
- `public` schema에 업무 table 생성, anon grant, authenticated write grant, `security definer` 우회 또는 RLS 비활성화
- migration 완화, 테스트용 allow-all policy, owner subject를 user-editable metadata에서 가져오는 정책
- 유료 plan, compute add-on, PITR, custom domain, IPv4, read replica, storage, realtime, function, integration marketplace 구매
- 실패를 다른 지역·다른 provider·실데이터·운영 환경으로 우회
- 독립 사용성·제품 검수, 출시 감사, Cherry acceptance, 출시, Phase 2 완료 또는 `EXTERNAL_OUTCOME_COMPLETE` 자동 진행

## 공식 제약 확인

확인일: 2026-08-25

- 최신 변경 이력 index: <https://supabase.com/changelog.md>
- specific region과 primary-region 계약: <https://supabase.com/docs/guides/platform/regions>
- Seoul region code `ap-northeast-2`: <https://supabase.com/docs/guides/functions/regional-invocation>
- 조직 단위 요금·Free project quota·프로젝트별 compute: <https://supabase.com/docs/guides/platform/billing-on-supabase>
- Clerk first-class third-party auth와 session-token access: <https://supabase.com/docs/guides/auth/third-party/clerk>
- third-party auth asymmetric JWT·key refresh·TP-MAU 제한: <https://supabase.com/docs/guides/auth/third-party/overview>
- RLS·grant·policy·view·JWT claim 경계: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- exposed table Data API 자동 노출 변경: <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>
- backup·Free logical export·daily backup·PITR 차이: <https://supabase.com/docs/guides/platform/backups>
- project deletion의 비가역성: <https://supabase.com/docs/guides/platform/delete-project>

현재 제약에서 중요한 판정은 다음과 같다.

- Free project에는 자동 daily backup을 주장하지 않는다. logical export와 재적용 증거만 restore rehearsal로 인정한다.
- Pro/Team/Enterprise daily backup 또는 PITR 사용은 유료 외부 변경이므로 HP2 기본 승인에 포함하지 않는다.
- Clerk 연동은 first-class third-party auth를 사용하며 deprecated JWT template/shared secret 방식을 금지한다.
- exposed schema table은 RLS가 필수다. 본 migration은 private `outcome_private` schema를 쓰고 authenticated에 필요한 SELECT만 명시적으로 grant한다.
- Clerk JWT의 `sub`와 서버가 고정한 membership만 권한 근거로 사용하며 user-editable metadata는 사용하지 않는다.
- secret/service-role key는 RLS를 우회할 수 있으므로 사용자 경로와 Vercel runtime에 존재하면 실패다.
- 2026-04-28 이후 SQL로 만든 table이 Data API에 자동 노출되지 않을 수 있으므로 exposed schema 설정과 `outcome_private` profile 접근을 별도로 확인한다. 무분별한 public grant로 해결하지 않는다.

## 인증·RLS 검증 행렬

| 행 | 기대 결과 |
| --- | --- |
| Clerk first-party owner token + active membership | owner workspace와 `cherry-note`, `outcome`의 current snapshot만 SELECT |
| 인증 없음 / publishable key만 있음 | private schema row `0` 또는 API deny; 존재 여부 비노출 |
| 다른 Clerk subject | owner workspace/project/snapshot/receipt row `0` |
| 위조 workspace/project selector | 서버·RLS 모두 deny 또는 row `0` |
| 미등록 Package project | row `0`; allowlist 밖 projection 없음 |
| revoked membership | 관련 table 모두 row `0` |
| expired/revoked Clerk session | Supabase 요청 전에 `401`; DB row 없음 |
| authenticated INSERT/UPDATE/DELETE/RPC | `405` 또는 database permission/RLS deny; row count 불변 |
| anon schema/table 접근 | permission denied; schema/table 목록 비노출 |
| secret/service-role client exposure probe | 식별자 탐지 `0`; runtime inventory에 이름도 없음 |

각 검증은 상태 코드·row count·reason category만 기록한다. token, subject, project ref, URL 값, SQL connection, key, raw response row는 기록하지 않는다.

## 합성 데이터·수명주기 검증

1. migration 후 8개 table, 8개 RLS, 8개 force RLS, 6개 SELECT policy와 grant inventory를 확인한다.
2. 합성 owner/other workspace와 membership, 허용/비허용 project binding, snapshot, receipt를 deterministic seed로 넣는다.
3. owner가 정확히 자기 workspace의 허용 project만 읽는지 확인한다.
4. 새 source digest snapshot을 append하고 `projects.current_snapshot_id`만 새 snapshot으로 이동하는지 확인한다.
5. 이전 snapshot과 deployment receipt가 삭제·덮어쓰기 없이 남는지 확인한다.
6. export에는 schema version·migration SHA·합성 row count·digest만 포함하고 key·subject·project ref·raw projection을 기록하지 않는다.
7. deletion request 시 access를 먼저 revoke하고 `deletion_jobs` lifecycle이 requested→revoked→purged 의미를 보존하는지 확인한다.
8. 삭제 전/후 owner·other·anon·write 거부 행렬을 다시 실행한다.

실행 도중 실제 Package 원문이나 개인 계정 데이터가 들어오면 즉시 중단하고 해당 project는 HP2 증거에서 제외한다.

## 복원 검증

- Free plan 기본 경로: exact migration + redacted synthetic seed manifest를 logical export로 고정하고, 동일 프로젝트의 별도 검증 schema 또는 별도 승인된 disposable branch/project에 재적용한다.
- 재적용 뒤 table/policy/grant/RLS SHA, synthetic row count, current snapshot pointer와 전체 deny 행렬이 원본과 일치해야 한다.
- 격리된 재적용 공간이 승인 범위에 없으면 복원은 `미실행`으로 기록하고 D5/D7을 닫지 않는다.
- Pro daily backup 또는 PITR 화면이 보이더라도 새 유료 승인이 없으면 사용하지 않는다.
- project delete는 영구적이며 backup도 함께 제거되므로 별도 삭제 승인 전에는 수행하지 않는다. rollback은 우선 Preview 비활성화와 session revoke이며 project 삭제가 아니다.

## D1-D7 실행 매핑

### D1 · 별도 HP2 승인

- HP1 P1-P6 `6/6`과 exact identity Preview receipt를 확인한다.
- Cherry의 정확한 HP2 허용·금지 문구를 비민감 참조로 기록한다.
- plan·region·예상 비용·rollback 대상이 모호하면 생성하지 않는다.

### D2 · isolated project와 비용

- project 1개, non-production label, exact Seoul region, approved Free/paid plan과 owner count를 확인한다.
- organization/project ref, account email, database password는 영수증에 기록하지 않는다.

### D3 · Clerk integration과 migration

- Clerk first-class third-party auth를 연결하고 role claim `authenticated` 및 asymmetric session-token 경계를 확인한다.
- exact migration을 한 번 적용하고 migration list·SHA·advisor·schema inventory를 고정한다.

### D4 · 실제 hosted deny matrix

- 인증·RLS 검증 행렬 전부를 실제 hosted Data API에서 실행한다.
- 허용 SELECT 외 mutation과 cross-workspace/unknown/revoked 접근은 row count 불변까지 확인한다.

### D5 · append/export/delete/restore

- 합성 data만으로 snapshot append/current pointer/export/deletion lifecycle을 검증한다.
- 승인된 격리 공간에서 logical restore rehearsal을 실행하고 parity를 확인한다.

### D6 · Preview workspace와 공개 경계

- Vercel Preview에 두 publishable data 환경 이름만 넣고 새 immutable Preview를 생성한다.
- MacBook/mobile에서 owner에게 두 허용 project만 보이며 public Production은 기존 receipt·200·405·가림을 유지하는지 확인한다.

### D7 · 영수증과 다음 Gate

- 정확한 candidate·migration·region·plan·환경 이름·row count·deny matrix·비용·rollback·한계를 비민감 영수증에 기록한다.
- 실패·미실행 행이 하나라도 있으면 관련 D Gate를 닫지 않는다.
- fresh UX & Product QA만 다음 권한으로 열고 Audit·Cherry acceptance·release는 자동 시작하지 않는다.

## 즉시 중단 조건

- HP1 P1-P6가 미완료이거나 정확한 HP2 승인이 없음
- region이 Seoul exact가 아니거나 plan·비용이 승인과 다름
- deprecated Clerk JWT template/shared JWT secret을 요구함
- secret/service-role/database credential을 Vercel runtime 또는 client에 넣어야 함
- migration SHA 불일치, 예상 밖 migration/table/policy/grant 존재 또는 advisor security error
- anon/other/revoked/write probe가 한 건이라도 허용됨
- 실제 Package 데이터·개인정보·로컬 경로·session identifier가 업로드 또는 출력됨
- logical export/restore 범위가 없는데 D5를 닫아야 함
- 공개 Production receipt·200·405·정보 가림이 변함

중단 시 실패를 성공으로 완화하거나 RLS를 느슨하게 만들지 않는다. credential이 출력되면 기록을 중단하고 철회·회전은 별도 승인으로 판단한다.

## 되돌리기 순서

1. Vercel Preview의 `OUTCOME_PRIVATE_SURFACE_ENABLED`를 먼저 제거하거나 비활성화한다.
2. Clerk Development의 해당 owner session을 모두 revoke한다.
3. Vercel Preview에서 `OUTCOME_SUPABASE_URL`, `OUTCOME_SUPABASE_PUBLISHABLE_KEY`를 제거한다.
4. 새 Preview가 private workspace `401` 또는 일반화된 unavailable, mutation `405`로 닫혔는지 확인한다.
5. Supabase third-party auth integration을 비활성화하고 publishable key 접근을 차단한다.
6. synthetic membership을 revoked 상태로 바꾸고 owner/other/anon row가 모두 0인지 확인한다.
7. 공개 Production의 commit/tree/asset, page/API `200`, mutation `405`, 금지 식별자 `0`을 재검증한다.
8. Supabase project 삭제는 비가역적이므로 별도 삭제 승인과 verified export 전에는 보존·pause 가능한 상태로 둔다.

## 결과 기록

- 실제 결과는 `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_RECEIPT_TEMPLATE.md`를 복제한 실행 영수증에만 기록한다.
- 값이 아닌 이름·상태·건수·해시·HTTP category만 기록한다.
- HP2 성공은 `HOSTED_DATA_PREVIEW_ONLY`다. fresh QA, Release Audit, Cherry acceptance, Production, release와 `EXTERNAL_OUTCOME_COMPLETE`를 뜻하지 않는다.
