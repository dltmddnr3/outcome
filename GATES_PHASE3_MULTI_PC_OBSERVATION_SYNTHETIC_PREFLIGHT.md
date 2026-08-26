# OUTCOME Phase 3 · Multi-PC Observation Synthetic Builder Preflight Gates

Outcome: 실제 장치·provider 동작 없이 O1/O3-O6 candidate를 만드는 최소 구현 계약이 ordering, freshness, privacy, recovery와 권한 경계를 고정한다.

- [x] B1: O2 실제 두 위치 증거와 synthetic candidate가 분리된다.
  CHECK: rg -q 'O2 REAL USE LOCKED' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'synthetic `source-a`와 `source-b`는 O2를 닫거나 실제 사용을 대체하지 않는다' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md
  EXPECT: real-use boundary explicit
  EVIDENCE: O2는 OPEN/LOCKED, 이 slice는 O1/O3-O6 candidate only다.

- [x] B2: exact source/tree와 brief digest mismatch가 mutation 전에 SAFE_HOLD한다.
  CHECK: rg -q 'SAFE_HOLD_SOURCE_DRIFT' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md
  EXPECT: fail-closed source authority
  EVIDENCE: task envelope pin과 brief SHA-256을 모두 요구한다.

- [x] B3: event schema와 primitive input boundary가 정의된다.
  CHECK: for value in 'binding_version' 'source_host' 'sequence' 'observed_at' 'availability' 'now_summary' 'primitive schema'; do rg -q "$value" docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md || exit 1; done
  EXPECT: O1 candidate contract complete
  EVIDENCE: project·role·binding·source·sequence·time·availability·NOW와 coercion 방지 계약을 고정했다.

- [x] B4: duplicate, out-of-order, gap, freshness와 no-progress semantics가 정의된다.
  CHECK: for value in 'idempotent duplicate' '낮은 sequence' 'sequence gap' 'freshness window' 'progress 필드와 completion authority가 존재하지 않는다'; do rg -q "$value" docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md || exit 1; done
  EXPECT: O3-O4 fail-closed semantics complete
  EVIDENCE: invalid observation은 valid projection을 덮지 않고 NOW/progress를 합성하지 않는다.

- [x] B5: redaction과 public projection 최소화가 정의된다.
  CHECK: rg -q 'raw session/thread ID.*입력 단계에서 거부' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'raw payload.*노출하지 않는다' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md
  EXPECT: O5 privacy boundary complete
  EVIDENCE: identifier·locator·prompt/result·credential·path 거부와 serialized scan을 요구한다.

- [x] B6: disconnect/reconnect, gap resync, disable/restore와 atomicity가 정의된다.
  CHECK: for value in 'disconnect' 'reconnect/resync' 'disable' 'restore' 're-entrant mutation' 'clock throw'; do rg -q "$value" docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md || exit 1; done
  EXPECT: O6 recovery and rollback complete
  EVIDENCE: CAS recovery, preserved evidence, write blocking과 deep-equal failure를 고정했다.

- [x] B7: 필수 negative tests와 전체 회귀 명령이 완전하다.
  CHECK: for value in 'boxed String' 'conflicting duplicate' 'serialized prohibited scan 0' 'npm run check:mutations' 'npm test' 'npm run build' 'git diff --check'; do rg -q "$value" docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md || exit 1; done
  EXPECT: test and regression surface complete
  EVIDENCE: RED/GREEN·privacy·atomicity·full regression 명령이 명시됐다.

- [x] B8: 실제 device/provider operation, external mutation과 Builder self-closure가 금지된다.
  CHECK: rg -q '실제 Codex thread/session.*실제 device observation' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'push/deploy/release/external message' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'O2, O1/O3-O6.*Builder가 자체 폐쇄' docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_BRIEF.md
  EXPECT: authority boundary complete
  EVIDENCE: provider·external·Gate closure는 모두 금지됐다.

ABANDON: 이 preflight는 O1/O3-O6 구현 PASS, O2 실제 사용, provider operation, Gate closure, push/deploy/release 또는 external completion이 아니다.
