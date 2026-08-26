# OUTCOME Phase 3 · Observation NOW Vocabulary Amendment

상태: `PLANNER CONTRACT AMENDMENT · BOUNDED SYNTHETIC CANDIDATE ONLY`

Observed: 2026-08-26 KST

## 결정

bounded Multi-PC Observation Relay의 `now_summary`는 자유 텍스트가 아니다. 다음 public-safe 한국어 상태 어휘 중 하나 또는 `null`만 허용한다.

- `작업 준비 중`
- `구현 진행 중`
- `테스트 실행 중`
- `검수 진행 중`
- `결과 정리 중`
- `응답 대기 중`

availability가 `available`일 때만 non-null 어휘를 받을 수 있다. `idle`, `offline`, `unknown`, stale, future, conflict, gap, disconnect 상태의 public NOW는 항상 `null`이다.

## 이유

자유 텍스트 denylist는 delimiter, Unicode, encoding, scheme과 path 표현을 유한하게 열거할 수 없어 세 차례 fresh QA에서 반복적으로 O5를 위반했다. raw prompt/result, identifier, locator, credential과 path를 받지 않는 finite vocabulary가 이 bounded candidate에서 검증 가능한 최소 경계다.

## 제품 의미

- 상태 어휘는 activity observation일 뿐 Gate progress, completion, approval 또는 dispatch authority가 아니다.
- UI는 이 어휘를 그대로 보여주거나 제품 문구로 매핑할 수 있으나 원문 prompt/result를 복원하지 않는다.
- 실제 Codex 작업내용의 동적 요약·스트리밍·애니메이션은 별도 redaction/summarization 계약과 Gate에서 다룬다.
- public HTTPS, relative path, 임의 한국어/영어 문장도 이 bounded relay의 `now_summary` 입력으로는 허용하지 않는다. 링크·artifact·상세 메시지는 별도 typed channel 대상이다.
- 이 amendment는 O2 실제 두 위치 증거, 실제 provider/session observation 또는 UI 채팅 구현을 승인하지 않는다.

## Builder correction

- 기존 free-text canonicalizer와 민감 패턴 denylist를 제거하고 exact primitive-string allowlist로 교체한다.
- boxed String, Symbol, object, accessor, Proxy와 allowlist 외 모든 string은 mutation 전에 `summary_prohibited`로 거부한다.
- 허용 어휘 6개는 exact original로 보존한다.
- empty string, leading/trailing whitespace, NFKC lookalike, percent/fullwidth/delimiter/scheme/path, raw-label/value와 160자 경계 문자열은 모두 거부한다.
- 기존 materialization guard, source set, clock, ordering, recovery, CAS, evidence와 disable/restore 불변조건은 유지한다.

## 권한 경계

actual device/provider/session/thread/browser/credential/private-store/network operation, runtime/API/UI/Gate/Map closure, push/deploy/release/external mutation은 모두 `0`으로 유지한다. O1-O6, O2, Phase 3, Audit와 Cherry acceptance는 fresh independent PASS 전까지 open이다.
