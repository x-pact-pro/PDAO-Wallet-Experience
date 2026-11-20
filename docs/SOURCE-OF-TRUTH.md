# PrivateDAO source-of-truth map

This file prevents local prototypes, stale exports, and deployment copies from
being mistaken for production sources.

## Authoritative sources

| Surface | Authoritative source | Deployment ownership |
|---|---|---|
| Wallet web SPA | `https://github.com/x-pact-pro/PDAO-Wallet-Experience`, branch `main` | AWS Amplify app `d2iwf2bo6lci0r`, `us-east-1`; latest verified successful job 117 |
| Chrome extension | The `dist-extension/` build produced from the same `main` source | Manual extension artifact; no separate application source |
| Android app | The `android/` module in the same `main` source and the same `public/pdao-config.js` runtime configuration | Release signing/build pipeline; debug APK is for device QA only |
| Agent Exchange and PrivatePAY | `https://github.com/x-pact-pro/PrivateDAO-Agent-Exchange` | AWS Lambda/API in `eu-north-1` |
| Core/kernel | Not used for this release review | Out of scope; do not import from an unrelated local checkout |

## Non-authoritative copies

- `/home/x-pact/PDAO-Wallet-Atelier` is a stale checkout of the wallet remote.
  It is not a deployment source.
- `/home/x-pact/PDAO-Wallet-Nova` and `/home/x-pact/PDAO-Wallet-Prestige` are
  local prototypes without a production remote; they must not be merged into
  the product without an explicit review.
- Those three non-authoritative wallet copies have been moved to
  `/home/x-pact/.quarantine/pdao-wallet-noncanonical-2026-11-20/` for
  recoverable storage; they were not deleted.
- Files under `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/` are immutable
  review artifacts, not source. Each artifact must identify its source commit,
  platform, signing status, and verification result.
- `/home/x-pact/PrivateDAO-AGENT-EXCHANGE-UNIFIED` is an archive/mirror. The
  dedicated GitHub Agent Exchange repository owns the live Lambda.

## Reconciliation rules

1. Pull or clone the authoritative remote before modifying production code.
2. Record the source commit in every web, extension, and Android artifact.
3. Never copy `.env`, wallet keys, keystores, or cloud secrets between clones.
4. Do not delete a local copy until its status, remote, and unique uncommitted
   work have been reviewed; archive or quarantine first when uncertain.
5. A green build is not deployment evidence. Confirm the target AWS job and
   live hostname separately.
6. The Seller Portal draft is not part of the wallet release surface and is
   removed from navigation and route rendering.
7. Alchemy is the primary configured EVM RPC for the web, extension and
   Android bundle; public fallbacks remain only for availability.
8. `https://github.com/x-pact-pro/PDAO-Wallet` is retained for comparison, not
   release ownership: its current package targets Node 22 and lacks the current
   runtime configuration contract used by this web/extension/Android release.

Current reviewed wallet source: `main` commit `031754c` (release code from `60cc659`; readiness documentation added in `031754c`).
