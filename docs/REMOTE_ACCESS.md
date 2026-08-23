# OUTCOME authenticated read-only remote access

Status: locally verifiable candidate; external activation awaits an authenticated private-network identity.

## Architecture

The Mac Mini remains the authoritative collector and runs the only OUTCOME Node process. The process reads local Cherry Note evidence, reduces it to the dashboard schema, redacts private evidence text, and serves the built UI on loopback. Tailscale Serve is the preferred stable HTTPS edge because it provides a tailnet identity boundary and TLS without making OUTCOME anonymously public.

`Mac Mini evidence → OUTCOME collector/API on 127.0.0.1:8787 → Tailscale Serve HTTPS → authenticated MacBook/mobile tailnet client`

Two independent gates protect data:

1. The device must be authenticated to Cherry's private tailnet. Tailscale Funnel or any anonymous public tunnel is forbidden.
2. OUTCOME requires its own 12-hour HttpOnly, Secure, SameSite=Strict session cookie before returning Project, NOW, Gate, freshness, or session-derived data.

The remote API is read-only. It has no dispatch, approval, source-file write, provider, Slack, relay, or release endpoint.

## Secrets

Create a local `.env.local` or launchd environment that is readable only by the Mac Mini user:

- `OUTCOME_ACCESS_PASSWORD`: a unique value of at least 12 characters.
- `OUTCOME_SESSION_SECRET`: at least 32 random characters used to sign short-lived cookies.
- `OUTCOME_CHERRY_NOTE_ROOT`: the authoritative local candidate root.
- `OUTCOME_CHERRY_NOTE_ROLLOUT`: the authoritative local rollout evidence file.

Do not put values in Git, logs, remote payloads, shell history, or the Tailscale configuration. Credential rotation is a Cherry-controlled action and is not part of this candidate.

## Local activation and verification

```sh
npm ci
npm run build
OUTCOME_ACCESS_PASSWORD='use-a-private-value' OUTCOME_SESSION_SECRET='use-at-least-32-random-characters' npm start
```

The application binds to `127.0.0.1:8787` by default. `/api/health` reveals only availability and that authentication is required. `/api/auth/session` reveals only a boolean. All dashboard payload routes return `401 authentication_required` before login.

## Private HTTPS activation

Prerequisites: Tailscale is running on the Mac Mini, MacBook Neo, and mobile; all three are signed into the Cherry-approved private tailnet; MagicDNS and HTTPS certificates are available.

After Cherry signs in and approves the tailnet identity, run on the Mac Mini:

```sh
tailscale serve --bg http://127.0.0.1:8787
tailscale serve status
```

Use the stable HTTPS URL printed by `tailscale serve status`. Do not run `tailscale funnel`. Verify from both MacBook and mobile that an unauthenticated request receives no project data, login succeeds over HTTPS, and logout returns to the authentication screen.

## Offline and stale behavior

The collector is `offline` when the authoritative Gate source cannot be read and `stale` when its most recent evidence is older than 180 seconds. The UI displays a warning and never presents cached success as current. Monitor both the generic `/api/health` endpoint and the authenticated collector badge; health alone does not prove source freshness.

## Rollout and rollback

Rollout is reversible and does not mutate source evidence:

1. Stop the prior OUTCOME process, start the pinned candidate, and run local authenticated probes.
2. Activate Tailscale Serve only after the private identity prerequisites are confirmed.
3. Verify desktop/mobile authentication, redaction, collector freshness, and no mutation controls.

Rollback:

```sh
tailscale serve reset
git switch --detach <previous-commit>
npm ci && npm run build
```

Restart the previous pinned local process. `tailscale serve reset` removes the HTTPS route but leaves local source evidence untouched. If the collector is unavailable during rollback, OUTCOME must remain offline rather than display a prior success snapshot.

## Current activation blocker

Tailscale is installed on the Mac Mini but currently stopped and has no active tailnet user, DNS name, or certificate domain. Minimum Cherry action: start Tailscale and sign the Mac Mini, MacBook Neo, and mobile into one Cherry-approved private tailnet, then explicitly approve running the two `tailscale serve` commands above. No paid purchase, domain transfer, broad OAuth scope, or anonymous access is required.
