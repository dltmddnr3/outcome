# OUTCOME Phase 3 · Codex Adapter Revalidation Receipt

Status: **CONTROLLED READ-ONLY O2 PROOF PREPARED · PRODUCTION RELAY NO_GO**

Observed: 2026-08-28 KST

## Exact local inventory

- installed binary: `/Applications/ChatGPT.app/Contents/Resources/codex`
- version: `codex-cli 0.149.0-alpha.4`
- App Server stable schema bundle: 291 files, composite SHA-256 `7f45f287f00c484e63336f97a89a249fcca9baa87b3811b278f1090e5b1f958b`
- App Server experimental schema bundle: 401 files, composite SHA-256 `5f6c5ea0f4724332f046fab4bf118153ffdce4346c571b77a4e87b9fb989fed7`
- private registry doctor: schema 2, revision 26, 2 projects, 8 role slots, issues 0, lock clear
- public-safe binding summary: OUTCOME active roles 0/4; Cherry Note active roles 4/4

No raw locator, thread/session/turn identifier, credential, prompt, result or local registry content is recorded here.

## Official contract revalidation

Primary source: `https://developers.openai.com/codex/app-server` (redirects to the current ChatGPT Learn App Server documentation).

- App Server is now explicitly documented as the interface for embedding Codex into a product.
- `thread/list` and `thread/read` are stable-surface methods. `thread/read` reads stored thread state without resuming or subscribing and exposes runtime status.
- `initialize` then `initialized` remains mandatory before other requests.
- `thread/resume`, `turn/start`, the initial in-progress response, streamed notifications and terminal `turn/completed` are documented separately.
- remote terminal connectivity supports `ws://` only for localhost/SSH forwarding and requires authenticated `wss://` behind TLS for non-local use.
- non-local authentication is documented, but the current CLI also exposes capability-token and signed-bearer-token App Server listener modes.
- enterprise integrations are instructed to use a known client identity and contact OpenAI for registration.

## Remaining blockers

The official contract still does not provide native OUTCOME project-role binding or a documented idempotency guarantee for `turn/start`. Provider acceptance remains distinct from terminal completion. Automatic retry after unknown delivery therefore remains forbidden.

Unattended Mac mini operation, production credential ownership/rotation/revocation, known-client registration, end-to-end operational cost ceiling and the exact TLS hosting topology are not closed by the local schema or public documentation.

## Decision

- production relay: `NO_GO`
- actual dispatch: `LOCKED`
- controlled O2 proof: `GO_PREPARED`, read-only only
- fallback until Cherry authorization: `UNBOUND_MANUAL_NAVIGATION`

The next authorized proof should enumerate/select one exact existing session locally, bind it only after Cherry confirms project+role, expose only public-safe status, and observe the same binding from two locations. It must not call `thread/resume`, `turn/start`, archive, rotate, write registry state, open a non-local listener, or access credentials until a separate exact proof-window authorization exists.

This receipt changes no Phase 3 Gate count. O2 remains `OPEN/LOCKED`; T1–T7 remain open; actual provider/session operations and external mutations are 0.

