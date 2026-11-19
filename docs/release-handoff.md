# Release handoff

## Current source and infrastructure status — 2026-11-19

The product in this repository is the new Wallet Atelier project, separate from
the existing wallet in `x-pact-pro/PDAO-Wallet`. Its production web deployment
is AWS Amplify app `d2iwf2bo6lci0r` in `us-east-1` at
https://main.d2iwf2bo6lci0r.amplifyapp.com/. This supersedes the earlier r7
handoff statement that the new app had no production URL. Vercel is not the
deployment target. GitHub Pages is a secondary preview only.

Latest packaged artifacts from the current Descope gateway UI and documentation
changes (r12):

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r12.zip` | `6f60085551dd2aa407752bc10b488c82cb529731f8b8534ee5f71f060d5e73ad` | Web build; pending Amplify release |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r12.zip` | `f081afc722e38c890065fe7e4e4011e60261c722068e1358ade9048dcfe91463` | MV3 package |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r12.apk` | `efb921a37f895b685ce65c4185e7828874a801a6f879f5b9146bc2ecd0334cb9` | Debug APK, target SDK 35; not release-signed |

A separate Descope agent identity gateway is deployed from
`infra/agent-gateway/template.yaml` to AWS `us-east-1`:
`https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com`. `/health` returned
200 and `GET /v1/agent/identity` returned 401 without a token. The Descope
Resource and agent clients are not yet configured, so a valid scoped token has
not been accepted. The r12 builds include gateway source and updated Descope
status branding; commit/push and Amplify deployment are pending.

For the complete project map and remaining objective checklist, see
[`session-index.md`](session-index.md).

## Build r7 — 2026-11-19

Source commit: `924eb6d8a6a9fc6e57feb4bba7c7b4246f94b370` on `main`.

Artifacts are created locally under `~/Desktop/PDAO-Wallet-Deliverables/`:

| Artifact | SHA-256 | Status |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r7.zip` | `e07552b7af84b9e306c9c78601420e587b68f6f6f2ebf6d0a004bbda5c550f76` | Production web build; ZIP integrity checked |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r7.zip` | `63ecd2c94a127dcac3ae08c83dd37512b0b7bfa38883d08a0c7e09eaa40a32ec` | MV3 extension package; ZIP integrity checked |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r7.apk` | `d2cb708870fd83bae0e96cc22d6d409714a93506c239c8a2c0a7e0aebfeb9a7a` | Debug-signed APK; Gradle build succeeded |

Both web builds completed with Node 26. Android assets were synchronized with
Capacitor before `assembleDebug`. No Android device or emulator was attached,
so installation, MWA wallet discovery, and transaction signing have not been
device-verified. The APK is not a release-signed F-Droid submission.

The Vercel team grant has not been approved yet; there is no production URL for
this new app at this handoff. The existing wallet domain was not changed.

## Public hosting

The current web app is published on GitHub Pages at
https://x-pact-pro.github.io/PDAO-Wallet-Experience/. A GitHub Actions workflow
rebuilds and deploys the `main` branch. Pages is configured for HTTPS. The
first deployment run (`44450268297`) completed successfully and the public
root and runtime configuration both returned HTTP 200. The existing wallet
domain remains untouched.

## Build r9 — Solana token balances

Source commit: `81a54a7` on `main`.

Adds read-only balances for both the original SPL Token program and Token-2022.
Balances aggregate by mint across local and connected Solana addresses. Unknown
mints are identified by their shortened on-chain address; no unverified token
name, logo, or dollar price is invented. Partial coverage is surfaced when an
RPC cannot read one or more wallet/program combinations.

Web, Chrome MV3, and Android debug builds all succeeded with Node 26 and the
local Android toolchain. Android remains debug-signed and has not been checked
on a physical device; these builds do not constitute an F-Droid release.

| Artifact | SHA-256 |
|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r9.zip` | `68e23d2e7f08caa2a9b4a0c61c78bcb2548f3cf9aa0ed52752bc9507dcad9d31` |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r9.zip` | `6548f8df74e7fda893f154855b4543d044ba7881a5854f4c36bafe3538fa3b94` |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r9.apk` | `0f39856f5dd19c1e0d1bbd98722980884ece31d7edf5d6a1160d6cb7bd54c60a` |

## Build r8 — portfolio balance reads

Source commit: `badaa67` on `main`.

This build adds native SOL and ETH balance reads with explicit mainnet labels,
partial/unavailable states, and RPC provider fallback. It does not include
SPL/ERC-20 token indexing or native transfer flows.

| Artifact | SHA-256 | Status |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r8.zip` | `ea02af002fd4a7f089adbe2e81b62c7378016be3a9a0d8bf9d9605236c460b9f` | Web build; ZIP integrity checked |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r8.zip` | `498b14fc97fc2fa7908b45afe2b2d9ab4ac5930e2ff7cc88e193766c82f8a190` | MV3 package; ZIP integrity checked |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r8.apk` | `8a03b476a1165cbeb6f12277c39ad4b2b33f535171885491912ad8041357eefa` | Debug APK; Gradle build succeeded |

Web and extension builds both passed with Node 26. Capacitor synced the
production web assets before the Android Gradle build. Mainnet balance reads
were probed against live Solana and Ethereum RPC endpoints without signing or
submitting transactions. Public RPCs are rate-limited and have no production
SLA. No emulator/device was attached, so UI balance rendering and Android MWA
remain unverified on a physical device.
