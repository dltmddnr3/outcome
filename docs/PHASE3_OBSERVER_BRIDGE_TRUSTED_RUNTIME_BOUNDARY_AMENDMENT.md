# Phase 3 Observer Bridge · Trusted Runtime Boundary Amendment

Status: **PLANNER CONTRACT / LOCAL BUILDER CORRECTION AUTHORIZED / EXTERNAL STATE LOCKED**

Observed: 2026-08-28 KST

## Exact decision basis

- reviewed candidate: `36fd268a0d29faa9bf954a6693d9158ef167779c`
- reviewed tree: `3e704d380166bda2350e6f38b4ebc5f529636b28`
- fresh QA FAIL carrier: `e02b28a277bb3837337f08e011513685690eba82`
- fresh QA FAIL tree: `fff341cc56811d63a007df8f990b81a4bf70900e`
- QA report SHA-256: `77c1607df3066bfdccd8b20b902996c3fd5f2cec42506a2bc42e4a74077281ff`

The QA report correctly proves that arbitrary JavaScript accessors, renamed bound functions, Proxy iterators, and mutated Promise internals can execute inside the prior injected test surface. It does not establish that a remote HTTP client can create those in-process objects. Treating both as the same threat class produced brittle function-name and Promise-constructor inspection that increased code complexity without improving the reachable network boundary.

## Remotely hostile input

The following are attacker-controlled and remain strict release blockers:

- raw URL bytes, percent encoding, query text, method and header values;
- cookie, bearer, Origin and CSRF strings;
- raw request body bytes delivered by the trusted platform as primitive string or genuine Buffer chunks;
- JSON primitives, object keys, duplicate keys, depth, UTF-8 validity and byte count;
- companion envelope, signature, nonce, sequence, timestamps and finite status code;
- database rows and adapter responses materialized across the persistence port.

For these inputs the implementation must preserve exact path allowlists, body caps, server-derived owner authority, companion ambient-auth removal, finite non-enumerating errors, private `no-store`, one invocation, zero automatic retry after uncertain completion, and zero partial success claims.

## Trusted in-process surface

The Node/Vercel request object, its platform-provided async iterator implementation, native Promise machinery, installed server dependencies and unmodified JavaScript intrinsics are trusted in-process surfaces for this stage. A caller that can replace them with Proxy traps, accessor-bearing methods, renamed bound functions or mutated Promise constructors already has code execution inside the trusted backend process.

That condition is classified as full trusted runtime or backend-process compromise. It is the same accepted Option A residual-risk class under which the dedicated bridge backend credential and process can violate bridge-row isolation. The implementation should still catch ordinary platform faults and return a best-effort finite 503, but trap-count zero is not a release claim after the trusted runtime itself has been replaced.

This amendment does not claim security against supply-chain compromise, arbitrary code execution, monkey-patched intrinsics or a malicious Vercel/Node runtime. Those require dependency integrity, deployment provenance and runtime isolation controls outside this local HTTP adapter slice.

## Required minimal Builder correction

Starting from the QA FAIL carrier, Builder must simplify the collector to the reachable boundary:

1. Keep the private hosted-error factory and private API-error brand already proven against externally supplied rejection objects.
2. Keep raw request path validation before URL normalization.
3. Collect only primitive string or genuine Buffer chunks and never use generic object coercion.
4. Remove function name and Promise constructor inspection as security decisions.
5. Use the trusted platform iterator normally inside one total `try/catch`; iterator creation, read or cleanup failure returns the existing finite private error and never retries.
6. Preserve byte cap, invalid UTF-8 rejection, exact concatenation, authentication separation, path/method allowlist and `no-store`.
7. Test hostile remotely controlled byte values and ordinary platform throw/reject behavior. Proxy-mutated request objects and Promise intrinsics remain explicit residual-risk probes, not promotion blockers.

No new dependency, database driver, environment value, migration, route, UI or product feature belongs in this correction.

## Supabase-ready boundary

Current official Supabase guidance selects transaction-pooler mode for serverless application traffic and requires prepared statements to be disabled there. The future database adapter must therefore expose one explicit transaction port, use no named prepared statements, and keep connection credentials server-only. This amendment does not install that driver or create a connection.

## Locked state

- Supabase project and hosted migration: `OPEN`
- database driver and credential binding: `OPEN`
- hosted adapter activation: `OPEN`
- O2 real two-location proof: `OPEN/LOCKED`
- Phase 3 promoted evidence: `17/43` unchanged
- fresh QA, fresh Release Audit and Cherry acceptance for the future hosted candidate: `OPEN`
- `EXTERNAL_OUTCOME_COMPLETE=false`

## Rollback and non-authority

The next Builder candidate must be locally revertible by its semantic commit and carry no external rollback because no external mutation is allowed. A Builder PASS only returns to fresh QA; it cannot reinterpret the prior FAIL, authorize Supabase, or advance progress.

## ABANDON

**ABANDON:** This document corrects the threat model and authorizes one bounded local simplification. It does not approve a paid resource, database connection, provider or credential change, environment activation, deployment, push, Release Audit, Cherry acceptance, O2 closure, Phase transition, release, or external completion.
