---
category: lessons
tags: [debugging, tls, networking, environment]
created: 2026-06-04
related_artifacts:
  - lib/sync/ado-client.ts
---

# Diagnosing Outbound Integration Failures: Verify the Live Process First

## TL;DR

When an outbound call (API/sync/webhook/DB) fails, capture ground truth from the
*actual serving process* — runtime version, env-var presence, resolved config —
before changing code or asking for environment changes; then diagnose by layer.

## Context

- An ADO "Sync Now" failed with `fetch failed: unable to get local issuer
  certificate`. Several round-trips were spent asking the user to set
  `NODE_EXTRA_CA_CERTS` and restart, none of which worked. Instrumenting the live
  server process revealed the real picture in one run.

## Detail

**Capture ground truth in the failing process, not the CLI.** Log `process.pid`,
`process.version`, presence (not values) of required env vars, and resolved config
from inside the running server. Two findings only became visible this way:
- The env var the user "set" never reached the server process (`present: false`).
- The dev server ran Node v22.17.1 while the CLI ran v22.22.0 — so a fix validated
  in the shell (`tls.setDefaultCACertificates`) did not exist in the server. Probe
  capabilities inside the runtime that has the bug.

**Diagnose by layer, top to bottom.** The error signature tells you the layer:
- DNS / TCP → host or connectivity.
- `unable to get local issuer certificate` → TLS trust. On corporate networks a
  proxy re-signs HTTPS with a root CA present in the OS store but absent from
  Node's bundled list. Node global `fetch`/undici uses only the bundled list.
- HTTP 3xx → login/sign-in redirect means **auth**, not transport.
- 401/403 → credential scope or validity.
- Parse error → payload/serialization.

**Check credential placeholders early.** A suspicious value was visible in logs
from the start (`patLength: 17` = the literal placeholder `your_ado_pat_here`).
ADO redirected (302 → `_signin`) because the PAT was never replaced.

**The fix that worked (corporate TLS interception, dependency-free):** route
requests through `node:https` with an `Agent` whose `ca` includes
`tls.getCACertificates('system')`, instead of global `fetch`. Use
`process.getBuiltinModule('node:tls'|'node:https')` so bundlers never try to
resolve the `node:` scheme for the browser. See `lib/sync/ado-client.ts` (`adoFetch`).

**Secret safety:** log presence/length/host only — never token, header, or PII values.

## Related

- [ADO client (adoFetch system-CA path)](../../lib/sync/ado-client.ts)
