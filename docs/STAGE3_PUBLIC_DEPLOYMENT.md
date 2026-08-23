# Stage 3 public read-only deployment receipt

Observed: 2026-08-23 KST
Authority: Cherry-approved bounded public read-only follow-up

- Public URL: `https://prizes-subaru-participation-ram.trycloudflare.com`
- Origin: Mac Mini loopback port 8791
- Origin PID at verification: `60045`
- Cloudflared PID at verification: `60046`
- Unified execution session: `58594`
- Cloudflared: official `2026.8.2` macOS arm64 release
- Download SHA-256 verified: `9042c2c5d8b2de78e60f313d5fb31b6c5c1cebde787a3caf1f2c9588084ac442`
- Public health: GET 200, `access=public_read_only`
- Public dashboard payload: GET 200, 15,627 bytes at verification
- Public mutation probe: POST 405, `read_only`
- Public redaction scan: payload, HTML, and JavaScript bundle PASS
- Remote Chrome: 1440x900 and 390x844 both overflow 0, detail overlap 0, current/next/public labels present

This receipt proves a live temporary feedback URL, not stable hosting, SLA, independent QA, Release Audit, Cherry acceptance, release, or `EXTERNAL_OUTCOME_COMPLETE`. Cloudflare Quick Tunnel assigns a random hostname, changes it on restart, and provides no uptime guarantee.
