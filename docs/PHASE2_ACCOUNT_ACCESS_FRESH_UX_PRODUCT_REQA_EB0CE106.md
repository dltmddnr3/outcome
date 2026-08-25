# Phase 2 Account Access Fresh UX & Product Re-QA

Date: 2026-08-25 KST

Role: new independent UX & Product QA reviewer, separate from Builder and the prior failed reviewer

Authority: UX & Product QA only

## Immutable review boundary

- Candidate commit: `eb0ce1064043a38021003c689d7685ae0d9dc6d9`
- Candidate tree: `ddc6f080790256c21c31bd2a000603dbcf013b94`
- Fresh detached worktree: `/private/tmp/outcome-account-correction-fresh-qa.hfzeWr`
- `origin/main` and `git ls-remote origin refs/heads/main`: exact candidate; `git merge-base --is-ancestor HEAD origin/main`: PASS.
- Public URL: `https://outcome-five.vercel.app`
- Direct public receipt: commit `eb0ce1064043`, tree `ddc6f0807902`, asset `index-fGSYVODK.js`, `runtimeNowPinned=false`, `boundary=deployment_snapshot`, `liveSessionRelay=false`.
- Local/public JS SHA-256: `a349ed3befb0a967d6ae981f979f2e4061610b5cdc63f5618bac670f502cb637`; both were 255,466 bytes.
- Source was clean before QA. The dependency directory was linked only as an ignored/untracked test prerequisite and removed before commit. Product code, providers, databases, secrets, domains, deployment, remote refs, and `docs/ROADMAP 2.md` were not modified.

## Terminal decision

Q1-Q4 pass for this exact corrected candidate. Independent reproduction closes the three prior blockers: ready mode exposes both allowed projects and the complete inspectable hierarchy while preserving source-current truth; login/loading/ready/logout and failure are exercised only through explicit synthetic injection and say that no real OAuth is connected; both required mobile viewports have zero horizontal overflow at 200% CSS zoom.

This result grants eligibility only for a separate fresh Release Audit on the same immutable candidate. It is not Release Audit, Cherry acceptance, production-resource approval, release approval, Phase 2 completion, or `EXTERNAL_OUTCOME_COMPLETE`.

## Correction challenge results

### QA-ACC-001 · Ready projection and hierarchy — corrected

The committed account browser drove the exact built candidate with a synthetic two-project response at 1440×900, 390×844, and 375×812. Each viewport rendered exactly two project controls (`Cherry Note`, `OUTCOME`), four hierarchy columns (`페이즈`, `범위`, `스테이지`, `완료 조건`), three source-current markers for the selected project, at least one Gate row, and a logout control of at least 44 px.

After selecting `체리 탐색 대상`, the source stage `체리 실제 현재` retained `aria-current="step"` and changed to `aria-selected="false"`; the touched stage had no `aria-current` and became `aria-selected="true"`. The actual-position text still named `체리 실제 현재`, while the selection text named `체리 탐색 대상`. Keyboard switching to OUTCOME set its project control to `aria-pressed="true"` and displayed `아웃컴 완료 조건`. Selection therefore did not rewrite actual current truth.

### QA-ACC-002 · Synthetic transition journey — corrected

The local runtime began without a private session, rendered `login`, accepted keyboard Enter on the Google control, visibly transitioned through `loading`, then rendered `ready`; logout returned to `login`. This completed three login and three logout adapter calls across the three required viewports. The UI states `검증용 공급자 중립 전환 · 실제 OAuth 연결 아님`.

The positive transition existed only because `createOutcomeServer` received an explicit `privateTransitionAdapter`. An injected 503 login failure kept the UI fail-closed in `login` and rendered `검증용 인증 전환을 완료하지 못했습니다.` Default/public `/api/private/auth/login` and `/api/private/auth/logout` remained canonical 405 read-only routes. No real Clerk, Google, Apple, email-code, Supabase, OAuth callback, provider account, or credential was used.

### QA-ACC-003 · Mobile 200% zoom — corrected

For every settled state (`login`, `empty`, `stale`, `conflict`, `unavailable`, `session_expired`, `access_denied`, `safe_degraded`, `ready`), plus loading and the ready transition journey, both 390×844 and 375×812 measured `scrollWidth - clientWidth = 0` after CSS zoom 2. Visible leaf text below 11 px: 0. Hidden or ellipsized overflowing leaf text: 0. Normal-size header/state-panel intersection: 0. Controls below 44 px: 0. State paragraph contrast below 4.5:1: 0. Reduced-motion active animations in the ready journey: 0.

The stable dashboard additionally passed all four viewports (1440×900, 390×844, 375×812, 844×390) with document overflow, viewport escape, clipping, ellipsis, and intersections all 0; controls were at least 44 px, text at least 11 px, contrast at least 4.5:1, focus contrast at least 13.60:1, and active animation count 0 under reduced motion.

## Direct public verification

- `/api/health`: 200 `available / public_read_only / deployment_snapshot`.
- `/api/private/config`: 200 with `enabled=false`, `private_read_only`, Google primary, Apple linked-only, email-code fallback, seven-day maximum, and `completionAuthority=false`.
- `/api/private/workspace`: 401 `{"error":"authentication_required"}`.
- Public mutation matrix: 32/32 exact 405; all 28 API mutations returned canonical `{"error":"read_only"}` and all four page mutation bodies were empty.
- Public API, HTML, bundle, and rendered UI disclosure scan: zero local paths, credentials, raw task/turn/thread/session identifiers, UUIDs, full hashes, or raw Gate evidence fields.
- Public `/workspace` rendered the expected disabled `unavailable` state with document overflow 0 at both 1440×900 and 390×844; it exposed no login control and made no OAuth claim.
- Remote dashboard browser checks passed 1440×900 and 390×844 across two projects, 48 hierarchy selections, and 25 Stage selections, with document overflow, clipping, ellipsis, intersection, translation fallback, and unexpected English all 0.

## Reproduced regression evidence

- `npm run test:account-access`: Node 18/18 and UI 5/5 PASS. This includes the exact PGlite/PostgreSQL RLS migration, two-workspace isolation, allowlist, forged selector denial, owner mismatch, expiry, revocation, provider outage, append-only snapshot/current pointer, and injected transition boundaries.
- `npm test`: frontend 64/64 and Node 97/97 PASS.
- `npm run test:security`: 28/28 PASS; stable snapshot prohibited disclosures 0 and Gate evidence fields 0.
- `npm run build:vercel`: PASS; exact candidate/tree finalized and `index-fGSYVODK.js` produced; stable-host tests 8/8 PASS.
- `npm run test:account-access-browser`: PASS; three viewports × nine settled states, loading, ready hierarchy, project/stage switching, keyboard login, logout, injected failure, reduced motion, mobile/phone 200% zoom, touch, contrast, and truncation assertions.
- `npm run test:stable-browser`: PASS at four viewports; 48 hierarchy selections and 25 selected Stages per viewport.
- `npm run test:portfolio-browser`: PASS for three isolated fixture projects at desktop/mobile.
- `npm run check:public-boundary`: local and public prohibited identifiers 0.
- `npm run check:mutations`: local and public 32/32 exact 405; API canonical read-only JSON 28/28.
- `npm run build:isolated`, `npm run check:scope`, `npm run check:runbook`: PASS.
- `OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run test:remote-browser`: PASS at desktop/mobile.

## Defects and limitations

No remaining blocker, high, or correction-scope defect was reproduced for QA-ACC-001/002/003.

The successful private journey is deliberately synthetic and provider-neutral. Production private configuration remains disabled, so this result does not prove real OAuth, hosted identity, hosted Supabase/RLS, provider cookie/callback behavior, backup/restore, WAF, alerting, cost controls, rollout, or rollback. Those remain evidence obligations for separately authorized provider/resource work and the separate fresh Release Audit. The runtime's synthetic cookie uses `SameSite=Strict`; compatibility with the approved real-provider `SameSite=Lax` architecture was not exercised and is not promoted by this QA result.

## Authority boundary

The exact candidate is eligible only for a separate fresh Release Audit. QA does not authorize a deploy, provider/resource/secret/database/domain mutation, push, Cherry acceptance, release, Phase completion, or external completion.

PASS_UX_PRODUCT_QA_ONLY
