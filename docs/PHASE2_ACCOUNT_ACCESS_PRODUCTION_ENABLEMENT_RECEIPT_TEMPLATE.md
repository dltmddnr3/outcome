# Phase 2 · HP3 운영 활성화 비민감 영수증 양식

상태: `TEMPLATE ONLY · NO SECRET VALUES · NO AUTHORITY`

## 1. 선행 증거

- HP1 P1-P6: `[6/6 receipt / 미완료]`
- HP2 D1-D7: `[7/7 receipt / 미완료]`
- hosted fresh UX & Product QA: `[pin·결과]`
- hosted separate Release Audit: `[pin·결과]`
- Cherry hosted candidate acceptance: `[pin·결정]`
- current public receipt: `[commit/tree/asset/deployment]`
- `EXTERNAL_OUTCOME_COMPLETE`: `false`

## 2. 결정과 권한

| 결정 | exact 승인 참조 | 허용 | 금지 | 결과 |
| --- | --- | --- | --- | --- |
| HP3-A 자원 준비 | `[ ]` | provider/data/host staged preparation | activation·real data·release | `[ ]` |
| HP3-B QA 검수 창 | `[ ]` | exact staged candidate의 제한 traffic | general traffic·real data·activation | `[ ]` |
| affected QA | `[ ]` | exact candidate review | implementation·promotion | `[ ]` |
| separate Audit | `[ ]` | exact candidate audit | Cherry acceptance·release | `[ ]` |
| Cherry production candidate | `[ ]` | candidate product decision | activation·release | `[ ]` |
| HP3-D 운영 활성화 | `[ ]` | exact owner-only read-only activation | signup·extra project·public release | `[ ]` |
| public-service release | `[별도]` | `[별도 범위]` | Phase/external completion 자동화 | `[ ]` |

## 3. 불변 후보

- repository commit/tree: `[40자리 / 40자리]`
- migration file/SHA-256: `[경로 / 64자리]`
- staged Production deployment: `[비민감 immutable URL 또는 ID]`
- rollback deployment receipt: `[commit/tree/asset]`
- environment-name inventory digest: `[SHA-256]`
- secret value count in receipt/Git/client/log: `0`

## 4. 소유권·도메인

- production root domain ownership: `[verified / 미확인]`
- DNS mutation owner: `[역할명]`
- provider account owner: `[역할명]`
- billing owner/payment approval: `[역할명·비민감 참조]`
- registrar/DNS/Vercel/Clerk plan change: `[없음 / 별도 승인]`
- exact origin/redirect/return URL count: `[건수]`
- wildcard origin/redirect/return URL: `0`
- rollback TTL/record/deployment: `[비민감 상태]`

domain 값, account email, organization/project/team 식별자는 기록하지 않는다.

## 5. Provider 준비

| Provider | 기대 | 관측 | 결과 |
| --- | --- | --- | --- |
| Clerk | production instance, owner-only, authorized parties | `[ ]` | `[통과/실패/미실행]` |
| Google | separate production project/client, exact origin/redirect, audience | `[ ]` | `[통과/실패/미실행]` |
| Apple | eligible App ID, Services ID/key, exact return URL, relay source | `[ ]` | `[통과/실패/미실행]` |
| Supabase | Pro Seoul, exact migration/RLS, managed backup | `[ ]` | `[통과/실패/미실행]` |
| Vercel | Production env isolation, staged immutable deployment | `[ ]` | `[통과/실패/미실행]` |

## 6. Production 환경 이름

값은 기록하지 않는다.

| 이름 | scope | 존재 | client 노출 허용 |
| --- | --- | --- | --- |
| `OUTCOME_PRIVATE_SURFACE_ENABLED` | Production | `[ ]` | 예, 상태값만 |
| `OUTCOME_CLERK_PUBLISHABLE_KEY` | Production | `[ ]` | 예, provider publishable |
| `OUTCOME_CLERK_SECRET_KEY` | Production | `[ ]` | 아니오 |
| `OUTCOME_OWNER_SUBJECT` | Production | `[ ]` | 아니오 |
| `OUTCOME_PRIVATE_ALLOWED_ORIGIN` | Production | `[ ]` | 아니오 |
| `OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT` | Production | `[ ]` | 아니오 |
| `OUTCOME_SUPABASE_URL` | Production | `[ ]` | 현재 server contract만 |
| `OUTCOME_SUPABASE_PUBLISHABLE_KEY` | Production | `[ ]` | provider publishable |

- unexpected env names: `[0/건수]`
- Preview values copied/inferred: `아니오`
- existing deployment retroactively changed: `아니오`

## 7. 데이터·복원

- exact migration/table/RLS/force RLS/policy/grant parity: `[통과/실패/미실행]`
- real Package/user data rows before activation approval: `0`
- latest managed backup age: `[시간 / 미확인]`
- isolated restore target separately approved: `[예/아니오]`
- restore elapsed time: `[측정 / 미실행]`
- measured RPO: `[측정 / 미실행]`; target `≤24h`
- measured RTO: `[측정 / 미실행]`; target `≤8h`
- deletion ledger replay: `[통과/실패/미실행]`
- deleted-row resurrection: `[0/건수/미실행]`
- PITR: `사용 안 함 / 별도 신규 승인`
- restore additional project/compute cost: `[USD / 미확인]`

## 8. 보안·제품 검증

- QA window candidate/start/expiry/actor receipt: `[비민감 참조]`
- QA window 만료 뒤 private deny 복귀: `[통과/실패/미실행]`
- Google/email code/linked Apple owner journey: `[결과]`
- other/unlinked owner deny: `[결과]`
- anon/cross-workspace/forged/revoked/write deny matrix: `[결과]`
- MacBook/mobile system browser: `[결과]`
- public page/API/health: `[상태]`
- public mutation `405`: `[건수/전체]`
- prohibited disclosure: `[0/건수]`
- exact two-project allowlist: `[결과]`
- fresh UX & Product QA: `[pin·결과]`
- separate Release Audit: `[pin·결과]`
- Cherry production candidate acceptance: `[pin·결정]`

## 9. 비용·관측

- estimated recurring monthly total: `[USD]`; ceiling `$75`
- notify threshold `$40`: `[configured/미실행]`
- restrict threshold `$60`: `[configured/미실행]`
- stop threshold `$75`: `[configured/미실행]`
- annual/one-time purchase: `[없음 / 별도 승인]`
- PITR/custom domain/read replica/extra compute paid add-on: `[없음 / 별도 승인]`
- 15-minute activation observation: `[결과/미실행]`
- 24-hour stability observation: `[결과/미실행]`
- observation owner and escalation role: `[역할명]`

## 10. 되돌리기 예행연습

- private surface disabled first: `[결과]`
- sessions revoked: `[결과]`
- last verified deployment restored: `[결과]`
- Production env inventory restored separately: `[결과]`
- compensating migration or backup restore: `[결과/미실행]`
- deletion ledger replay: `[결과/미실행]`
- public/private/data/cost regression: `[결과]`
- destructive project/provider deletion performed: `아니오`

## 11. 남은 결정

- production root domain: `[pending/decided]`
- Google audience/publishing/verification: `[pending/decided]`
- Apple web eligibility: `[pending/decided]`
- Vercel staged Production topology and plan: `[pending/decided]`
- isolated restore cost/target: `[pending/decided]`
- HP3-A approval: `[pending/approved/rejected]`
- HP3-B QA window approval: `[pending/approved/rejected]`
- HP3-D activation approval: `[pending/approved/rejected]`
- public-service release: `[pending/approved/rejected]`

## 기록 금지

- 이메일, 실명, account·organization·project·team·user·subject·session 식별자
- OAuth code, access/refresh/session token, cookie, verification code와 raw JWT/claim
- Clerk secret, Google client secret, Apple private key·Key ID, Supabase secret/service-role, database password/connection string
- environment value, local absolute path, session/thread/task/turn identifier, 실제 Package payload와 raw Gate evidence
- registrar login, DNS credential, Vercel token과 provider callback query

노출이 발생하면 기록을 중단하고 surface를 비활성화한다. session revoke, key rotation, data restore, project deletion은 각각 별도 승인·영수증 경계다.
