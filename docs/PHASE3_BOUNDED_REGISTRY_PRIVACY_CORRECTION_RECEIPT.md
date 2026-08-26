# OUTCOME Phase 3 · Bounded Registry Atomicity and Privacy Correction Receipt

상태: `CORRECTION_CANDIDATE_READY_ONLY · FRESH RE-QA REQUIRED · R1-R6 OPEN`

Observed: 2026-08-26 KST

## Failure source

- failed candidate: `9a00f2549d7eee3193bea1f61fe4134f9ed3028a`
- fresh QA report commit: `3207c28cfd62e6fadab16b821dda930f96c52c03`
- QA verdict: `FAIL`
- blocking findings: re-entrant clock duplicate active binding, clock-failure partial mutation without audit, prohibited audit reason disclosure

## RED evidence

첫 후보에서 `session 123e4567-e89b-12d3-a456-426614174000` reason을 사용한 bind가 성공하고 동일 문자열이 audit에 직렬화되는 것을 재현했다. correction test를 먼저 추가한 실행은 `12 tests · 11 pass · 1 fail`이었다.

Fresh QA는 별도 worktree에서 다음을 추가 재현했다.

- 동일 project+role에 active binding 2개
- clock 두 번째 호출 실패 뒤 revision 1, active binding 1, audit 0
- raw-session·credential·embedded-path reason 4/4 accepted and serialized

## Exact correction candidate

- commit: `97cb4d337b16dab2c08b835f25c98914e3ece470`
- tree: `f329e4fa8ba1a814c6bd41eb2b9a824c820c55d7`
- parent: `3207c28cfd62e6fadab16b821dda930f96c52c03`
- changed paths:
  - `server/phase3-private-session-registry.mjs`
  - `server/phase3-private-session-registry.test.mjs`

## Correction

- 모든 write를 registry-level mutation guard로 감싸 재진입 write를 `mutation_in_progress`로 fail closed한다.
- clock을 state commit 전에 정확히 한 번 materialize하고 ISO timestamp를 검증한다.
- clock 예외·invalid timestamp는 `clock_unavailable`로 반환하며 state·revision·audit를 변경하지 않는다.
- binding timestamp와 audit timestamp가 같은 materialized 값을 사용해 부분 commit 가능성을 제거한다.
- audit reason은 3–64자의 lowercase public-safe code만 허용하고 session/thread/token/secret/password/authorization/credential/api_key/locator/path/sk/pk/ghp segment를 거부한다.

## GREEN evidence

| Check | Result |
| --- | --- |
| focused registry suite | `14/14 PASS` |
| Package model | `39/39 PASS` |
| mutation matrix | `local 32/32=405 · API 28/28 read_only · empty page 0/4` |
| frontend suite | `89/89 PASS` |
| full Node suite | `126/126 PASS` |
| production build | `1652 modules · PASS` |
| `git diff --check` | `PASS` |

새 adversarial tests는 prohibited reason 6종의 no-mutation, re-entrant write 단일 active invariant, one-shot clock atomic success와 throwing clock deep-equal no-mutation을 검증한다.

## Operation and authority boundary

- actual provider/session/thread operation: `0`
- credential/private-store access: `0`
- runtime/API/UI/account-access mutation: `0`
- push/deploy/release/external message: `0`
- production relay: `NO_GO`
- fallback: `UNBOUND_MANUAL_NAVIGATION`

이 correction은 first QA FAIL을 수정한 Builder candidate다. fresh independent re-QA 전에는 R1-R6, Release Audit, Cherry acceptance, Phase 3 진행률 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
