# Release handoff

## Current source and infrastructure status — 2026-11-19

### r16 — manual wallet-provider rescan

Source commit: `b27218d` on `main`; deployed to AWS Amplify Virginia
(`us-east-1`) with manual job `10` (`SUCCEED`). The public root and
`/pdao-config.js` returned HTTP 200. The live JavaScript and CSS assets also
returned HTTP 200, and the application bundle contains “Scan for wallets again”
and `eip6963:requestProvider`.

The Wallets workspace offers a manual rescan for Solana Wallet Standard and
injected/EIP-6963 EVM providers, including silent recovery of prior provider
authorization. Desktop/mobile browser UI inspection included 390x844; no wallet
provider was connected or interacted with. Provider availability depends on
the browser/extension and chain support.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r16.zip` | `4f79548b80b95074c71cf665668e0597e42ff3b591eac2a6a33b05763031efbe` | Amplify job `10` deployed; live JS/CSS verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r16.zip` | `047ca17a9bcbbfadce452a68826518c45ef74575bf420f181710f2afb6a9c658` | Chrome MV3 production build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r16.apk` | `06746c73942a7b2c5f46b987b395cba1985ba3bd4894969d8531bfc713e6d1a0` | Android SDK 35 debug build; not release-signed |

No funded transaction, connected-wallet interaction, physical-device test,
or biometric/passkey journey was performed.

### r15 — live wallet-provider state

Source commit: `9aaa490` on `main`; deployed to AWS Amplify Virginia
(`us-east-1`) with manual deployment job `9` (`SUCCEED`). The published root,
runtime config, JavaScript, and CSS returned HTTP 200; the live application
bundle contains the provider lifecycle updates.

Solana discovery now refreshes on both Wallet Standard registration and
unregistration. EVM connections follow `accountsChanged`, `chainChanged`, and
`disconnect`, updating the connected account/network or clearing stale
connections. The web, Chrome MV3, and Android debug builds succeeded. This is
build and hosting verification; it does not claim a funded transaction or
physical Android device validation.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r15.zip` | `2f40abed373bae0963f75e27c3c36ad17847c4c3623706651bb5ce140dd33396` | Amplify job `9` deployed; live assets verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r15.zip` | `6163f3f28a328e68b0edceea49b13b262b4f35114290a080e924d668f6691185` | Chrome MV3 production build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r15.apk` | `68776f3b220cb4331fb90ec291c3d79ff3d56914e070f81116a544525411a94e` | Android SDK 35 debug build; not release-signed |

### r14 — native SOL and ETH sends

Source commit: `f6da731` on `main`; deployed on AWS Amplify Virginia
(`us-east-1`) with job `8` (`SUCCEED`). The application root and runtime
configuration returned HTTP 200, and the published application JavaScript
contains the native transfer workflow.

The shared Wallets screen now supports native SOL and ETH sends from locally
encrypted wallets and connected wallet providers. It checks the destination,
network, balance and current fee estimate, requires local signing or wallet
provider approval, broadcasts through public RPC endpoints, and waits for an
on-chain confirmation/receipt. No funded Mainnet transaction or Android device
transaction was performed; this release verifies compilation and deployment,
not a successful transfer.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r14.zip` | `5e103a2a9c64c79c570431daf95f67d400ac5c7f43a62f1a50f519d622869938` | Amplify job `8` deployed; live bundle verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r14.zip` | `061d7ae79bd52f1de05600000e213eca138297c580614d3314ef298aa56a0f52` | Chrome MV3 production build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r14.apk` | `8bdf112ebc4d1fe1aadbbebac625a47eb95f2e2de58a2c3b167c5aa4d9105a8a` | Android SDK 35 debug build; not release-signed or F-Droid-ready |


The product in this repository is the new Wallet Atelier project, separate from
the existing wallet in `x-pact-pro/PDAO-Wallet`. Its production web deployment
is AWS Amplify app `d2iwf2bo6lci0r` in `us-east-1` at
https://main.d2iwf2bo6lci0r.amplifyapp.com/. This supersedes the earlier r7
handoff statement that the new app had no production URL. Vercel is not the
deployment target. GitHub Pages is a secondary preview only.

Previous packaged artifacts for the r13 design pass (built on Node 26.13.1;
web deployed to Amplify job `7`, status `SUCCEED`, in `us-east-1`):

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r13.zip` | `143f1217a24c94dee641fc8bf65ce752c96fbfa445227316de8085d67a843845` | Published to Amplify job `7`; page and runtime config HTTP 200 |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r13.zip` | `2731df07d0d1eefdeac0770f3c441b0bd764d44b4dd30076116c5283b2700621` | MV3 package |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r13.apk` | `87382097b455679a98364b6fdfda1665a69f0fe59266bcb019ae8d6c293362d9` | Debug APK, target SDK 35; not release-signed |

A separate Descope agent identity gateway is deployed from
`infra/agent-gateway/template.yaml` to AWS `us-east-1`:
`https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com`. `/health` returned
200 and `GET /v1/agent/identity` returned 401 without a token. The Descope
Resource and agent clients are not yet configured, so a valid scoped token has
not been accepted. The gateway status UI remains explicit about the pending Descope Resource/client
grants. r14 is live at https://main.d2iwf2bo6lci0r.amplifyapp.com/; the root page and `/pdao-config.js` both returned HTTP 200.

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
