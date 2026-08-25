# OUTCOME Phase 3 · Codex Adapter Technical Spike Builder Brief

State: `DISPATCH_READY · PRIVATE_TARGET_CHERRY_CONFIRMED · SEND_RECEIPT_PENDING`

This brief is prepared but not sent. The actual Builder session ID belongs only in the private runtime registry and must not be added to Package documents, Git, logs, screenshots or public payloads.

## Objective

Determine whether a supported Codex interface can safely observe an existing session and deliver an exact-session Planner instruction with acknowledgement semantics. Return an evidence-based GO/NO-GO for `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6`; do not implement the Phase 3 registry, relay or router.

## Immutable input

- repository source pin: commit `7f8f1f08f5f552b919cf8b5f7486b5fbf286ba9e`
- tree: `a7422da7dffe9b06543a47eebd4e1c9de29e07b4`
- handoff: `docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md`
- product contract: `docs/PHASE3_EXISTING_SESSION_OPERATIONS_CONTRACT.md`
- Gate: `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6`
- role: Builder only; no QA/Audit/Cherry authority

## Allowed

- inspect current repository and installed supported Codex CLI/app interfaces read-only
- research current official OpenAI/Codex primary documentation and record exact URL/date/version
- create a local spike harness and tests under a narrowly named Phase 3 spike path only if no actual user session mutation is required
- use synthetic/no-op fixtures for observation, dispatch, acknowledgement, timeout, duplicate and redaction behavior
- write a spike receipt and update S1-S6 evidence only when the exact check is directly observed
- create a local candidate commit with exact source/tests/evidence; do not push

## Forbidden

- enumerate or expose real sessions before Cherry completes local picker explicit bind
- send a message or task to a real Codex session
- mutate private Codex databases, scrape UI, call hidden endpoints or extract credentials
- implement production registry, relay, hosted queue, router or browser UX
- edit/open `docs/ROADMAP 2.md`, Cherry Note iOS or unrelated Phase 2 surfaces
- create/change Vercel, provider, secret, paid resource, DNS, database or external account state
- push, deploy, release, close Phase 3 execution, self-QA, self-audit or self-accept

## Required checks

1. supported interface inventory covers observe/send/ack/auth/limits/cost/terms/versioning
2. missing/unsupported capabilities fail closed and never become active/success
3. synthetic wrong project/role/binding, timeout and duplicate idempotency probes pass
4. public output/log scans show raw session/thread/task/turn ID, path and credential hits `0`
5. high-risk without exact confirmation is denied; actual high-risk execution count `0`
6. public `/api` mutation boundary remains 405 and Package tests remain green
7. final worktree status identifies every task-owned file and preserves unrelated files

## Required receipt

- exact commit/tree and changed files
- official primary source pins with observation dates
- capability matrix: `supported | unsupported | unknown`
- reproduction commands, exit codes and bounded output
- test counts and negative probe counts measured from output
- secret/public-boundary scan result
- GO/NO-GO with smallest supported fallback
- rollback command for task-owned candidate files
- `git status --short`, residual unknowns and stop-condition assessment

Natural-language completion without the artifacts above is not evidence. A GO opens only the separately scoped Registry implementation handoff; it is not Phase 3 progress beyond S1-S6 and not QA, release or acceptance.

## Stop and return SAFE_HOLD

- official/supported interface cannot be confirmed
- feasibility requires real-session message, private DB mutation, UI scraping, hidden endpoint or credential extraction
- provider terms, permission, rate/cost or acknowledgement meaning is unclear
- any public disclosure, cross-project ambiguity or unrelated file overlap appears
- requested action exceeds Technical Spike scope

## Dispatch prerequisite

Cherry confirmed the previously designated OUTCOME-dedicated thread as the bootstrap Builder target. Planner must verify that private thread is accessible on the Mac mini, send this brief once, and keep its raw identifier outside Git. This manual assignment is `MANUAL_BOOTSTRAP_NOT_RELAY_PROOF`; do not promote it to a Phase 3 product binding or first routed-task evidence.
