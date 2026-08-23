# Stage Gates

Stage ID: stage-id

Outcome: State the result that this Stage must prove.

- [ ] G1: State one verifiable acceptance condition.
  - CHECK: `replace with a runnable read-only check when possible`
  - EXPECT: state the exact passing result
  - EVIDENCE: pending

Completion requires every Gate to contain valid evidence or an explicit `ABANDON` record with its reason. Implementation, test, evidence closure, independent QA, Cherry acceptance, and release remain separate states.
