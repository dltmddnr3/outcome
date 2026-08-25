# Phase 2 · HP3 운영 활성화 결정 준비 절차

상태: `DECISION PREFLIGHT ONLY · NO EXTERNAL MUTATION · NO RELEASE AUTHORITY`

이 문서는 HP3를 지금 실행하지 않는다. HP1·HP2와 hosted 후보 검증이 실제 증거로 끝난 뒤, 운영 자원 준비와 실제 운영 활성화를 서로 다른 승인으로 판단할 수 있게 입력·비용·검증·되돌리기를 고정한다.

## 현재 입력과 선행 조건

- 로컬 결정 준비 기준 commit: 실행 직전 `HEAD`와 tree를 새 영수증에 고정한다.
- 현재 공개 운영 기준: `origin/main`의 public read-only 배포; account private surface는 계속 비활성이다.
- HP1 hosted identity: 현재 P1 승인만 닫힌 `1/6`; P2-P6은 실제 증거 대기다.
- HP2 hosted data: `D1-D7 0/7`; 별도 승인도 아직 없다.
- hosted fresh UX & Product QA, separate Release Audit, Cherry hosted acceptance: 모두 실제 HP2 후보 뒤에 남아 있다.
- `EXTERNAL_OUTCOME_COMPLETE=false`이며 HP3 준비, 운영 활성화, 공개서비스 출시는 모두 미승인이다.

다음이 모두 닫히기 전에는 HP3 외부 변경 승인을 요청하지 않는다.

1. HP1 `P1-P6 6/6`의 실제 개발 인증·Preview·MacBook/mobile 영수증
2. HP2 `D1-D7 7/7`의 실제 hosted RLS·수명주기·복원 영수증
3. exact hosted candidate의 fresh UX & Product QA PASS
4. 같은 pin의 separate fresh Release Audit PASS
5. Cherry의 hosted candidate 실제 사용 승인
6. 운영 도메인, provider 소유 계정, 예상 월비용, 결제 주체, rollback owner 결정

## 권한 분리

### HP3-A · `RESOURCE_PREPARATION_ONLY`

별도 exact HP3 자원 준비 승인 뒤에도 다음만 허용한다.

- Clerk production instance와 자체 Google·Apple 연결을 만들되 canonical owner 외 가입은 닫는다.
- 소유한 운영 root domain과 필요한 DNS record를 설정하되 private surface flag는 비활성으로 유지한다.
- Supabase Pro Seoul production project를 만들고 exact migration·grant·RLS·managed backup을 검증한다.
- Vercel Production 환경 이름을 정확히 분리하고 값은 외부 secret store에만 둔다.
- domain이 자동 연결되지 않는 staged Production deployment를 만들 수 있는 현재 plan·설정을 먼저 확인한다.
- 합성 데이터만으로 운영 후보의 auth, RLS, backup/restore, 관측, 비용, rollback을 검증한다.

결과는 `PRODUCTION_RESOURCE_CANDIDATE_ONLY`다. 실제 사용자 데이터 반입, private traffic, domain cutover, activation, release는 포함하지 않는다.

### HP3-B · `QA_WINDOW_ONLY`와 영향 후보 독립 검증

HP3-A가 만든 exact disabled/staged candidate에 대해 새 UX & Product QA와 별도 Release Audit을 다시 수행한다. hosted Preview의 이전 QA/Audit은 production provider·domain·data·deployment 후보에 재사용하지 않는다.

실제 provider·domain 여정을 검수하려면 별도 exact QA-window 승인이 먼저 필요하다. Builder/operator만 승인된 staged URL/domain에서 private flag를 일시적으로 열고, reviewer는 mutation 권한 없이 검수한다. window는 actor·시작·만료·candidate·허용 계정·자동 재차단을 영수증에 고정하며 일반 production traffic, real Package data와 production domain cutover를 허용하지 않는다. 격리된 검수 topology가 없으면 QA를 시작하지 않는다.

검증은 최소한 실제 Google·email code·linked Apple, owner-only deny, production RLS, managed backup과 isolated restore, `RPO ≤ 24h`, `RTO ≤ 8h`, 비용 stop, domain/cookie/redirect, public `405`·가림·receipt parity와 rollback을 포함한다.

### HP3-C · Cherry 운영 후보 승인

Cherry는 같은 immutable candidate를 MacBook과 mobile system browser에서 직접 검수한다. 이 승인은 후보 사용성·제품 적합성 판정이며 실제 활성화나 출시 승인이 아니다.

### HP3-D · `PRODUCTION_ACTIVATION`

별도 exact 운영 활성화 승인 뒤에만 private surface flag, production domain assignment와 실제 canonical owner 접근을 연다. 공개서비스 출시, 외부 사용자 가입, Phase 2 완료는 다시 별도 결정이다.

## 공식 제약 확인

확인일: 2026-08-25

### Clerk

- production deployment: <https://clerk.com/docs/guides/development/deployment/production>
- instance/environment 차이: <https://clerk.com/docs/guides/development/managing-environments>
- production은 소유 domain과 DNS 변경 권한, production API keys, 자체 OAuth provider credentials가 필요하다.
- development 설정 복제 시 SSO connection, integration, path 설정은 자동 복제되지 않으므로 이름별 재확인이 필요하다.
- production publishable/secret key는 development key와 분리하며 secret 값은 문서·Git·영수증에 기록하지 않는다.
- root domain의 모든 subdomain을 무제한 신뢰하지 않고 Clerk `authorizedParties`와 허용 subdomain을 exact allowlist로 제한한다.

### Google

- audience/publishing 상태: <https://support.google.com/cloud/answer/15549945>
- production verification 예외·환경 분리: <https://support.google.com/cloud/answer/13464323>
- app branding: <https://support.google.com/cloud/answer/15549049>
- production app homepage/privacy policy: <https://support.google.com/cloud/answer/13807376>
- 개발·staging·production Cloud project를 분리한다. owner-only라는 이유만으로 운영 OAuth 검증·branding·privacy 요구가 자동 면제된다고 가정하지 않는다.
- `Testing`은 최대 100 test users이고 동의가 7일 뒤 만료될 수 있으므로 지속 운영에 적합한지 HP3 승인 전에 판정한다.
- exact authorized JavaScript origin과 redirect URI만 등록하고 wildcard 또는 Preview URL 전체 허용을 금지한다.

### Apple

- web 환경 구성: <https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple>
- private relay: <https://developer.apple.com/documentation/signinwithapple/communicating-using-the-private-email-relay-service>
- web Sign in with Apple은 기존 Sign in with Apple-enabled App ID, Services ID, private key, Team ID, exact domain과 absolute return URL을 요구한다.
- 현재 Cherry 소유 Apple Developer account와 기존 app이 OUTCOME web Services ID의 primary App ID로 적격인지 먼저 확인한다. 적격성 미확인은 HP3 stop이다.
- Apple private key는 one-time download credential로 취급하고 값·파일명·로컬 경로·Key ID를 일반 영수증에 기록하지 않는다.
- relay email을 사용할 경우 발신 domain/source 등록과 개인정보 안내가 필요하며 Apple relay identity가 두 번째 owner를 만들 수 없다.

### Supabase

- 최신 changelog: <https://supabase.com/changelog.md>
- production checklist: <https://supabase.com/docs/guides/deployment/going-into-prod>
- billing FAQ: <https://supabase.com/docs/guides/platform/billing-faq>
- backups/PITR: <https://supabase.com/docs/guides/platform/backups>
- restore to new project: <https://supabase.com/docs/guides/platform/clone-project>
- account contract가 승인한 production target은 Pro Seoul이다. Pro 조직은 일일 managed backup을 제공하며 현재 Pro 보존은 최근 7일이다.
- PITR은 별도 add-on이고 현재 7일 보존이 약 `$100/month`부터 시작하며 Small 이상 compute도 요구하므로 OUTCOME `$75/month` 상한 밖이다. 새 승인 없이는 사용하지 않는다.
- restore 중 source project가 접근 불가할 수 있고 restore-to-new-project는 새 paid project·compute 비용을 만들 수 있으므로 격리 restore 비용과 downtime을 사전 승인한다.
- 2026-07 backup scheduling 및 restore credential 수정, 2026-04 Data API auto-exposure 변경을 실행 직전 changelog에서 다시 확인한다.

### Vercel

- environments: <https://vercel.com/docs/environment-variables>
- staged promotion: <https://vercel.com/docs/deployments/promoting-a-deployment>
- instant rollback: <https://vercel.com/docs/instant-rollback>
- deployment checks: <https://vercel.com/docs/deployment-checks>
- 환경값 변경은 기존 deployment에 소급되지 않고 다음 deployment에만 적용된다. 영수증은 환경 이름 inventory와 resulting deployment pin을 묶는다.
- Preview 환경값을 Production에 복사·추론하지 않는다. Production 이름과 값을 새로 확인한다.
- staged Production build의 domain auto-assignment를 끌 수 있는 현재 plan·project 설정을 먼저 읽기 전용 확인한다. 사용할 수 없으면 대체 cutover를 추론하지 않고 중단한다.
- Instant Rollback은 이전 build/config로 domain을 되돌리지만 변경된 환경값을 재빌드하지 않아 stale config가 될 수 있다. deployment rollback과 environment rollback을 별도 단계로 검증한다.
- Rolling Release는 Pro/Enterprise 기능이므로 현재 phase에서 자동 채택하지 않는다.

## 운영 변경 표면

| 제공자 | 준비 시 변경 | 활성화 시 변경 | 미승인/금지 |
| --- | --- | --- | --- |
| Clerk | production instance, exact methods, owner bootstrap, authorized parties | production session 허용 | public signup, organization, second owner |
| Google | 별도 Cloud project, OAuth web client, branding/audience, exact origin/redirect | production consent 사용 | wildcard redirect, broad scopes, shared dev secret |
| Apple | eligibility 확인, Services ID, key, domain/return URL, relay source | linked owner login 허용 | unlinked direct owner 생성, key 기록 |
| Supabase | Pro Seoul project, exact migration/RLS, backup, isolated restore | canonical owner read-only rows | real data before approval, PITR, write grant, public schema 완화 |
| Vercel | Production-scoped env names, staged immutable deployment, domain inventory | domain assignment와 private flag enable | Preview value 복사, unpinned redeploy, auto release |
| Domain/DNS | 소유권·registrar·TTL·record·rollback 확인 | exact production record cutover | 미소유 domain, broad wildcard, 별도 미승인 구매 |

운영 환경 이름은 기존 code contract의 여덟 이름만 허용한다.

- `OUTCOME_PRIVATE_SURFACE_ENABLED`
- `OUTCOME_CLERK_PUBLISHABLE_KEY`
- `OUTCOME_CLERK_SECRET_KEY`
- `OUTCOME_OWNER_SUBJECT`
- `OUTCOME_PRIVATE_ALLOWED_ORIGIN`
- `OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT`
- `OUTCOME_SUPABASE_URL`
- `OUTCOME_SUPABASE_PUBLISHABLE_KEY`

Supabase secret/service-role/database password/connection string은 현재 read-only runtime 계약에 추가하지 않는다. 실제 code contract가 바뀌면 별도 Builder·QA·Audit 후보가 먼저 필요하다.

## 데이터·복원 준비

1. exact reviewed migration과 SHA를 새 production candidate에 다시 고정한다.
2. table·grant·RLS·force RLS·policy·Data API exposed schema inventory를 실제 production project에서 합성 data로 검증한다.
3. anon, other owner, forged selector, unregistered project, revoked/expired identity, authenticated write의 deny matrix가 전부 통과한다.
4. Pro managed daily backup 존재와 최신 successful backup age를 확인하되 provider 표시만으로 restore 성공을 주장하지 않는다.
5. 별도 승인된 isolated project에 restore하고 migration/schema/grant/RLS, synthetic row count, current pointer, receipt integrity를 대조한다.
6. restore 뒤 30-day deletion ledger와 hard-delete receipt를 재적용해 삭제 데이터가 부활하지 않는지 확인한다.
7. 실제 측정 restore 시간이 `RTO ≤ 8h`, 관측 가능한 최대 데이터 손실이 `RPO ≤ 24h` 목표를 충족해야 한다. 이는 Supabase SLA가 아니라 OUTCOME acceptance target이다.
8. restore-to-new-project 비용, source downtime, custom role credential 재설정 필요 여부를 영수증에 기록한다.
9. 실제 Package payload와 owner account data는 HP3-C와 별도 `PRODUCTION_ACTIVATION` 승인 전 반입하지 않는다.

## 후보·검증 순서

1. 최신 `HEAD=origin/main`, public receipt와 마지막 verified rollback deployment를 고정한다.
2. exact HP3-A 승인 뒤 provider resources와 Production env names를 준비한다.
3. private surface disabled 상태로 staged immutable Production candidate를 만든다.
4. 합성 identity/data로 security, restore, cost, health, logging/redaction과 rollback rehearsal을 수행한다.
5. exact candidate에 fresh UX & Product QA를 수행한다.
6. 같은 pin에 separate fresh Release Audit을 수행한다.
7. Cherry가 MacBook/mobile에서 같은 production candidate를 직접 판정한다.
8. 별도 `PRODUCTION_ACTIVATION` 승인 뒤에만 domain assignment와 private flag를 연다.
9. 실제 canonical owner 로그인 후 15분 집중 관측과 24시간 안정 관측을 분리한다. 관측 중이라는 이유로 Gate를 자동 닫지 않는다.
10. 공개서비스 출시와 Phase 2 완료는 다시 별도 결정으로 남긴다.

필수 stop 조건:

- owned production domain 또는 DNS 변경 권한이 없음
- Apple web eligibility 또는 Google production publishing/verification 상태가 미확인
- 예상 recurring cost가 `$75/month`를 넘거나 one-time/annual purchase가 별도 승인되지 않음
- staged Production candidate를 traffic 없이 검증할 방법이 확인되지 않음
- latest backup, isolated restore, RPO/RTO 또는 deletion ledger replay가 미실행/실패
- secret 값이 Git, 문서, Gate, 로그, screenshot, 메시지 또는 client bundle에 노출
- public mutation `405`, redaction, receipt parity, private deny 또는 two-project allowlist 회귀
- fresh QA, Audit, Cherry production candidate acceptance 또는 exact activation approval 누락

## 되돌리기 순서

1. `OUTCOME_PRIVATE_SURFACE_ENABLED`를 끄거나 domain을 last verified public deployment로 되돌려 private traffic을 먼저 차단한다.
2. affected Clerk sessions를 revoke하고 노출된 key가 있을 때만 별도 rotation authority에 따라 회전한다.
3. Vercel deployment rollback과 Production environment inventory rollback을 각각 확인한다. 과거 build 복귀가 현재 env 복귀를 뜻하지 않는다.
4. migration이 data-compatible하면 reviewed compensating migration을 사용한다. 아니면 closest verified backup을 restore하고 accepted migrations와 deletion ledger를 replay한다.
5. 파괴적 삭제는 첫 rollback 조치가 아니다. evidence export, restore validation과 별도 삭제 승인이 먼저다.
6. page/API/health, public `405`, prohibited disclosure `0`, private deny, auth revocation, receipt parity, RLS/data integrity와 비용 상태를 재검증한다.
7. rollback 성공은 복구 영수증일 뿐 release, Phase 완료 또는 외부 완료가 아니다.

## HP3 자원 준비 승인 문구

아래 문구는 선행 증거와 비용·도메인 결정이 모두 채워진 뒤에만 제시한다.

> `HP3-A 운영 자원 준비 승인: exact receipt에 고정된 Clerk production, Google OAuth, Apple web credential, Supabase Pro Seoul, Vercel staged Production 환경과 owned domain/DNS 준비만 허용. private surface 활성화, 실제 데이터 반입, domain traffic cutover, 운영 출시와 외부 사용자 접근은 금지.`

## QA 검수 창 승인 문구

아래 문구는 HP3-A resource candidate와 즉시 재차단 절차가 고정된 뒤, fresh QA 시작 전에만 제시한다.

> `HP3-B QA 검수 창 승인: exact staged production candidate에서 지정 reviewer와 canonical test owner의 제한된 검수 traffic만 허용하고 Builder/operator가 private flag를 일시적으로 연다. window 만료 즉시 재차단하며 일반 production traffic, real Package data, domain cutover, activation과 release는 금지.`

## 운영 활성화 승인 문구

아래 문구는 HP3-A 후보의 fresh QA, separate Release Audit과 Cherry production candidate acceptance가 같은 pin에서 끝난 뒤에만 제시한다.

> `HP3-D 운영 활성화 승인: exact production candidate와 rollback receipt에 한해 canonical Cherry owner의 private read-only 접근과 production domain assignment를 허용. public signup, 추가 사용자·프로젝트, dashboard mutation, 외부 공개서비스 출시, Phase 완료는 금지.`

## 결과 기록

- 실제 판단과 실행 결과는 `docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_RECEIPT_TEMPLATE.md`를 복제한 비민감 영수증에만 기록한다.
- resource preparation, QA window, affected QA, Audit, Cherry candidate acceptance, activation, release를 각각 다른 시각·actor·pin으로 기록한다.
- 현재 결과는 `HP3_DECISION_PREFLIGHT_ONLY`이며 HP3 승인이나 운영 준비 완료가 아니다.
