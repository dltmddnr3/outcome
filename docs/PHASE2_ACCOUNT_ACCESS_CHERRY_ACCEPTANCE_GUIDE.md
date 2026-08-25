# Phase 2 · Account Access Cherry Acceptance Guide

Status: `SUPERSEDED CANDIDATE · C1-C4 0/4`

Public candidate: `https://outcome-five.vercel.app`

## Historical evidence · disabled predecessor only

- Fresh UX/Product re-QA: `PASS_UX_PRODUCT_QA_ONLY` for the disabled predecessor.
- Separate fresh Release re-Audit: `PASS_RELEASE_AUDIT_ONLY` for the disabled predecessor.
- Public dashboard is read-only; account/private config is intentionally disabled; mutations remain 405.
- Real Clerk/Google/Apple/Supabase resources, secrets and hosted private data were not created.
- HP0 changed the candidate code after those reports. New hosted-preview QA/Audit evidence is required before C1 can close again.

## Cherry direct review

### MacBook and mobile

1. Open the public candidate and confirm OUTCOME shows the account-access Cherry acceptance Stage as current.
2. Switch between Cherry Note and OUTCOME; inspect Phase → Scope → Stage → Gate and confirm selected location never replaces actual-current truth.
3. Open `/workspace`. It must show a safe unavailable/private-disabled state, no usable OAuth control, no project existence leak and no false completion claim.
4. Confirm the dashboard remains readable on both MacBook and mobile and that the next action is understandable.

### Current candidate limitation

The deployed public candidate cannot demonstrate real login/logout because the private configuration and transition adapter are deliberately disabled. Login/loading/ready/logout were verified only through an explicit synthetic adapter in isolated tests, labelled as not real OAuth. Enabling Clerk/Google/Apple/Supabase, hosted restore/WAF/alerts/cost enforcement or private data requires a separate external-mutation decision and cannot be inferred from this acceptance.

## Decision boundary

- C2 may close only if Cherry accepts the directly observable disabled-public journey plus the disclosed synthetic login/logout evidence as this Stage's intended scope.
- If Cherry requires a directly touchable login/logout preview before acceptance, C2 remains open and a separately authorized preview/provider Stage must be defined; do not reinterpret current evidence.
- The decision-ready execution boundary is `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md`: HP0 prepares credential-free code, while HP1 Clerk development identity, HP2 hosted Supabase data and HP3 production enablement each require separate authority.
- C3 requires Cherry's explicit account-access Stage closure approval.
- C4 requires Cherry to confirm that public-service release and `EXTERNAL_OUTCOME_COMPLETE` remain separate/open.
