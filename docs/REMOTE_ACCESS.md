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

This candidate verified Cloudflare's official `cloudflared` 2026.8.2 macOS arm64 release after matching its GitHub release SHA-256. Start the origin and tunnel in one long-lived terminal session so termination cleans up the origin:

```sh
OUTCOME_PUBLIC_READ_ONLY=1 OUTCOME_PORT=8791 node server/index.mjs >.outcome-runtime/server.log 2>&1 &
outcome_server_pid=$!
trap 'kill "$outcome_server_pid" 2>/dev/null' EXIT INT TERM
.outcome-runtime/cloudflared tunnel --url http://127.0.0.1:8791 --no-autoupdate 2>&1 | tee .outcome-runtime/tunnel.log
```

Read the random URL from `.outcome-runtime/tunnel.log` and record only the public URL in `.outcome-runtime/public-url`. Keep the two PID files with the originating processes. Process presence alone does not prove service health; verify the public health GET, dashboard GET, mutation 405, and redaction after every restart.

## Offline and stale behavior

The collector is `offline` when the authoritative Gate source cannot be read and `stale` when its most recent evidence is older than 180 seconds. The UI displays a warning and never presents cached success as current. Monitor both `/api/health` and the collector badge; health alone does not prove source freshness.

## Rollout and rollback

Rollout is reversible and does not mutate source evidence:

1. Start the pinned candidate in explicit public mode and run local public/auth regression probes.
2. Start one Quick Tunnel process and capture its random URL/PID.
3. Verify desktop/mobile hierarchy, redaction, collector freshness, and no mutation controls through the public URL.

Rollback:

```sh
kill "$(cat .outcome-runtime/tunnel.pid)" "$(cat .outcome-runtime/server.pid)"
git switch --detach <previous-commit>
npm ci && npm run build
```

Stopping the two recorded PIDs immediately removes the temporary public route without touching source evidence. Restart the previous pinned local process in its default authenticated mode. If the collector is unavailable during rollback, OUTCOME must remain offline rather than display a prior success snapshot.

## Process restart

After any Mac Mini restart, repeat the long-lived terminal command and re-run all public probes. The old URL must be treated as expired because Quick Tunnel assigns a new random URL on restart. This Codex deployment is maintained by unified execution session `58594`; terminating that session stops both live processes.

## Stable hosting follow-up Gate

Quick Tunnel closes only the temporary public-feedback slice. A later Gate must select stable hosting, persistent hostname/domain, access policy, service supervision, monitoring/SLA, secret ownership, abuse controls, and rollback. That Gate requires separate Cherry approval and must not infer a paid purchase, domain transfer, or public mutation authority.
