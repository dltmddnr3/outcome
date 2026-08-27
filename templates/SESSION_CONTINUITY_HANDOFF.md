# OUTCOME Package · Session Continuity Handoff

status: DRAFT | READY | CONSUMED | SAFE_HOLD
continuity_state: healthy | watch | handoff_required | successor_starting | successor_verified | predecessor_archived | blocked | rotation_failed
written_at: <ISO-8601>
project: <canonical project>
role_title: Planner | Builder | UX & Product QA | Release Audit
bounded_objective: <one bounded objective>

## Package position

- phase:
- scope:
- stage:
- gate:

## Exact source and receipt binding

- source_root:
- commit:
- tree:
- parent:
- contract_paths_and_sha256:
- candidate_identity:
- immutable_receipts_and_sha256:
- handoff_sha256:

## Authority and safety boundary

- authority_owner:
- approved_actions:
- forbidden_actions:
- external_mutation_count:
- privacy_boundary:
- rollback_or_cleanup:

## Evidence and open work

- evidence_closed:
- open_gates:
- blocker:
- decision_owner:
- next_bounded_action:
- stop_conditions:

## Continuity health

- observed_triggers:
- platform_capacity_metric: unavailable | <official metric name>
- configured_threshold_and_basis: unavailable | <value, unit, evidence, authority>
- health_evidence_receipt:

## Integrity

- false_completion_count:
- learning_receipt:
- raw_conversation_copied: false
- secrets_or_private_identifiers_copied: false
- inferred_progress_copied: false

## Successor verification

- successor_started: false
- continuity_ready: false
- source_authority_reverified: false
- active_binding_updated: false
- predecessor_archived_after_verification: false
- rotation_receipt:

## Fresh independent role rule

For `UX & Product QA` and `Release Audit`, do not copy predecessor conversation narrative. Re-pin only the exact candidate/source, approved contract, Gates and immutable receipts required for independent verification.

## ABANDON

This template is a handoff contract, not proof that rotation, Gate closure, QA, Audit, acceptance, release or completion occurred.
