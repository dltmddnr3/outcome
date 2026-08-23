# OUTCOME public read-only remote access

Status: Cherry-approved temporary public HTTPS mode using Cloudflare Quick Tunnel.

## Architecture

The Mac Mini remains the authoritative collector and runs the only OUTCOME Node process. The process reads local Cherry Note evidence, reduces it to the dashboard schema, redacts private evidence text, and serves the built UI on loopback. A Cloudflare Quick Tunnel forwards public HTTPS GET requests to that loopback origin without opening an inbound port.

`Mac Mini evidence → OUTCOME collector/API on 127.0.0.1:8787 → Cloudflare Quick Tunnel HTTPS → MacBook/mobile browser`

Access modes are explicit:

1. Default: without `OUTCOME_PUBLIC_READ_ONLY=1`, OUTCOME requires its 12-hour HttpOnly, Secure, SameSite=Strict signed session cookie before returning any dashboard data or bundle.
2. Cherry-approved public read-only: with `OUTCOME_PUBLIC_READ_ONLY=1`, sanitized dashboard HTML, bundle, and GET API are public without login. No login secret is required or accepted in this mode.

Both modes are read-only. Every dashboard mutation or unknown POST returns `405 {"error":"read_only"}`. There is no dispatch, approval, source-file write, provider, Slack, relay, or release endpoint. Public payloads pass a final recursive sanitizer that removes keys for paths, credentials, cookies, rollout/session/thread/task/turn data, and hashes, then sanitizes string values.

## Secrets

Authenticated mode may use a local launch environment readable only by the Mac Mini user:

- `OUTCOME_ACCESS_PASSWORD`: a unique value of at least 12 characters.
- `OUTCOME_SESSION_SECRET`: at least 32 random characters used to sign short-lived cookies.
- `OUTCOME_CHERRY_NOTE_ROOT`: the authoritative local candidate root.
- `OUTCOME_CHERRY_NOTE_ROLLOUT`: the authoritative local rollout evidence file.

Public mode uses neither credential. Do not put source credentials or private values in Git, logs, remote payloads, or shell history.

## Local activation and verification

```sh
npm ci
npm run build
OUTCOME_PUBLIC_READ_ONLY=1 npm start
```

The application binds to `127.0.0.1:8787` by default. In public mode `/api/health` returns only `status=available` and `access=public_read_only`; the dashboard GET returns sanitized evidence. POST probes must return `405 read_only`.

## Temporary public HTTPS activation

Cloudflare Quick Tunnel is a free, accountless development tunnel. It creates a random `*.trycloudflare.com` URL for the lifetime of the tunnel process. The URL changes after restart and Cloudflare provides no SLA or uptime guarantee. It is not stable hosting.

This candidate verified Cloudflare's official `cloudflared` 2026.8.2 macOS arm64 release after matching its GitHub release SHA-256. The origin writes its actual PID atomically only after the loopback listener is active and removes that record only when it still owns it. Start the origin in one terminal:

```sh
OUTCOME_PUBLIC_READ_ONLY=1 OUTCOME_PORT=8791 npm start
```

In another long-lived terminal, verify the origin identity/port and start the tunnel through the validated runtime boundary:

```sh
OUTCOME_PORT=8791 node scripts/runtime-process.mjs status origin
OUTCOME_PORT=8791 node scripts/runtime-process.mjs start-tunnel .outcome-runtime/cloudflared
```

The tunnel command records only the actual child after its command identity includes `cloudflared tunnel` and the exact loopback URL. Read the random URL from `.outcome-runtime/tunnel.log` and record only the public URL in `.outcome-runtime/public-url`. Process presence alone does not prove service health; verify the validated origin/tunnel statuses, public health GET, dashboard GET, mutation 405, and redaction after every restart.

## Offline and stale behavior

The collector is `offline` when the authoritative Gate source cannot be read and `stale` when its most recent evidence is older than 180 seconds. The UI displays a warning and never presents cached success as current. Monitor both `/api/health` and the collector badge; health alone does not prove source freshness.

## Rollout and rollback

Rollout is reversible and does not mutate source evidence:

1. Start the pinned candidate in explicit public mode and run local public/auth regression probes.
2. Start one Quick Tunnel process and capture its random URL/PID.
3. Verify desktop/mobile hierarchy, redaction, collector freshness, and no mutation controls through the public URL.

Rollback:

```sh
OUTCOME_PORT=8791 node scripts/runtime-process.mjs status tunnel
OUTCOME_PORT=8791 node scripts/runtime-process.mjs status origin
OUTCOME_PORT=8791 node scripts/runtime-process.mjs stop tunnel
OUTCOME_PORT=8791 node scripts/runtime-process.mjs stop origin
git switch --detach <previous-commit>
npm ci && npm run build
```

Each stop refuses a missing, malformed, dead, wrong-command, or wrong-port/URL PID record and sends SIGTERM only after actual process identity is verified. This prevents stale bookkeeping from signaling an unrelated process. A validated tunnel stop removes the temporary public route without touching source evidence. Restart the previous pinned local process in its default authenticated mode. If the collector is unavailable during rollback, OUTCOME must remain offline rather than display a prior success snapshot.

## Process restart

After any Mac Mini restart, repeat the two validated start commands and re-run all public probes. The old URL must be treated as expired because Quick Tunnel assigns a new random URL on restart. Never copy a historical PID into runtime bookkeeping: `status` must confirm current command identity and origin port/tunnel URL relation. The current temporary URL remains recorded in `.outcome-runtime/public-url`; its process lifetime, not a documentation value, is authoritative.

## Stable hosting follow-up Gate

Quick Tunnel closes only the temporary public-feedback slice. A later Gate must select stable hosting, persistent hostname/domain, access policy, service supervision, monitoring/SLA, secret ownership, abuse controls, and rollback. That Gate requires separate Cherry approval and must not infer a paid purchase, domain transfer, or public mutation authority.

Atomic isolated `dist` build/swap, a stable hostname and supervisor, configurable validated Package roots, and explicit authenticated-cookie hardening remain Stage 7 operational follow-ups. They are not implemented by the PID/redaction corrective slice.
