# PDAO Wallet session index

Updated: 2026-11-19 (r18). This index reconciles the original brief with the current
independent product, repositories, deployed AWS resources, and verified gaps.
It is a navigation/handoff aid, not proof that unfinished product features are
complete.

## Objective

Continue building a new, responsive self-custody wallet for desktop/mobile web,
Chrome MV3, and Android from one React/TypeScript source. The experience should
feel like a quiet premium financial institution, with vivid live-market and
trading surfaces. Keep the three distributions aligned while adapting to each
platform. The Android app is rebuilt in this repo, with target SDK 35; do not
base it on an old local Android project.

The source brief is [PDAO-WALLET-CODEX-BRIEF.md](</home/x-pact/Desktop/PDAO-WALLET-CODEX-BRIEF.md>).
It remains a product reference, but its original single-repo deployment
instructions describe the existing wallet and are superseded for this new app
by the repository and deployment map below.

## Repository map: two wallet projects

| Project | Source | Hosting | Rule |
|---|---|---|---|
| Existing PDAO Wallet | `x-pact-pro/PDAO-Wallet`; historical local app `d1yr54h1b2l04l` | Existing AWS Amplify app in `us-east-1` | Keep unchanged during work on the new app. |
| New Wallet Atelier | `x-pact-pro/PDAO-Wallet-Experience`; local `/home/x-pact/PDAO-Wallet-Atelier` | New Amplify app `d2iwf2bo6lci0r`, `us-east-1` | Shared source for web, Chrome, and Android. Auto-build is off; deploy manually. |

GitHub Pages is a secondary preview. Vercel is not the production target.

### Official hostname status

`wallet.privatedao.org` was served by the existing PDAO Wallet Amplify app
`d1yr54h1b2l04l`; its source repository `x-pact-pro/PDAO-Wallet` remains
unchanged. The intended hostname target is the new Atelier app
`d2iwf2bo6lci0r`. Its Amplify domain association is `PENDING_VERIFICATION` and
requires the Namecheap CNAME `wallet CNAME d3girmftahg4rp.cloudfront.net`.
Namecheap is authoritative; the AWS Route 53 zone is not delegated. Its
published CNAME still points to the former distribution, so the hostname
cutover is not complete. Auth0's Atelier web client now allows
`https://wallet.privatedao.org/auth/callback`, the origin, and logout URL; the
older `PDAO Wallet` Auth0 client was not modified.

## Service and region boundaries

| System | Current authority |
|---|---|
| Human authentication | Auth0 tenant `dev-xojmajo443e15z7n.us.auth0.com`; new SPA and native clients belong to the new app. |
| Agent identity | Descope project `PrivateDAO`, project ID `P3LeEm9CWaHUiGrt0hNS1Xglk2Mt`; separate from Auth0. |
| Agent identity gateway | New PDAO-owned API Gateway + Lambda in AWS `us-east-1`; current URL `https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com`. CloudFormation source: `infra/agent-gateway/template.yaml`. |
| Agent Exchange and PrivatePAY | Existing source `x-pact-pro/PrivateDAO-Agent-Exchange`, live Lambda in `eu-north-1` (Stockholm). Keep its route contract; do not deploy or modify it from this wallet repo. Read `/home/x-pact/PRIVATEPAY-X402-CANONICAL-STATE.md` before relevant changes. |
| Wallet AI API | Existing wallet analysis API in AWS `us-east-1`; it receives questions and public catalog context, not wallet secrets. |
| Web hosting | New Amplify app `d2iwf2bo6lci0r`; current URL `https://main.d2iwf2bo6lci0r.amplifyapp.com/`. |

## Identity and authorization status

- Auth0 handles people. Browser token storage stays in memory; private keys and
  recovery phrases never go to Auth0 or an API.
- Descope handles machine-agent identity and authorization. The UI carries the
  Descope wordmark and distinguishes project connection, gateway deployment,
  and actually authorized access.
- The AWS HTTP API has a Descope JWT authorizer for issuer
  `https://api.descope.com/P3LeEm9CWaHUiGrt0hNS1Xglk2Mt`, exact audience equal
  to its API URL, and `agent.identity.read` on `GET /v1/agent/identity`.
- Verified live: `/health` returns 200; identity without a bearer token returns
  401. Descope has no API Resource or agentic client yet; its FGA schema is
  empty. Acceptance of a valid audience/scope token is not verified.
- Context recovery check (2026-11-19): the Descope MCP operation catalog
  exposes the `CreateResource` schema under `connect_write`, but the executable
  `connect_write` tool enum omits that operation, so it cannot be invoked
  through that tool. A direct read of the official Descope Management API using
  the supplied local management key was denied by Cloudflare Error 1010
  (`browser_signature_banned`); the request was not retried. No Descope
  configuration was changed and no key value was printed. Resume by creating
  the API Resource in Descope Console (or through a working official MCP/API
  path), with the exact gateway audience URI and `agent.identity.read` scope,
  then configure an approved client and verify both allowed and rejected JWTs.
- Do not turn on `descope.enabled` or claim “secured by Descope” until the
  Resource, client policy/grant, and positive/negative token checks pass.
- Existing Agent Exchange/x402 payment requests remain governed by their
  canonical provider and wallet-signing contract. Descope identity cannot
  authorize settlement or replace a wallet signature.

## Commerce and PDAO utility token

- Agent Exchange service names and prices are read from the live catalog; do
  not duplicate a static price list or add an unapproved markup.
- PrivatePAY/x402 keeps the canonical exact quote, local signing, verification,
  and settlement sequence. Do not display guessed amounts or fabricate results.
- The brief asks for paid AI/trading packages, usage commissions, swap/trade
  fees, and automatic conversion of service fees to PDAO before treasury
  settlement. These are not yet implemented. Before charging, require the live
  fee/quote route, supported conversion path for each chain/currency, verified
  treasury destination, and on-chain receipt. Never guess a rate or recipient.
- Pump.fun, Moonshot, and other meme-venue connections are not live trading
  integrations yet. A DApp link is not an agent execution result.

## Current handoff (r18 deployed)

- The production hostname is not serving the new Atelier build yet. The old
  app association was removed and the new Amplify association is
  `PENDING_VERIFICATION`, with target `wallet CNAME
  d3girmftahg4rp.cloudfront.net`. Namecheap still publishes the former
  distribution target. Route 53 is not authoritative.

- r17 adds a persistent compact desktop sidebar and replaces the placeholder
  support toast with a link to the new repository issue tracker. Source commit
  `6ded40b` is pushed to `main`; Amplify job `12` for app `d2iwf2bo6lci0r`
  succeeded, and the live root/config/JS/CSS returned HTTP 200. Web, Chrome MV3,
  and Android debug builds succeeded. Artifacts and hashes are in
  `docs/release-handoff.md`.
- r18 adds a Ctrl/⌘+K quick-navigation panel and removes the empty alert bell.
  Source commit `305f829` is pushed to `main`, Amplify job `13` succeeded, and
  the live JS/CSS/runtime config returned HTTP 200. The web, Chrome MV3, and
  Android target SDK 35 debug artifacts and hashes are recorded in
  `docs/release-handoff.md`. No new browser screenshot or device-only flow was
  verified.
- r16 source commit `b27218d` is pushed to `main` and deployed to the new AWS
  Amplify app `d2iwf2bo6lci0r` in `us-east-1` as job `10` (`SUCCEED`). The live
  root and runtime config returned HTTP 200; the published application bundle
  includes the manual wallet-provider rescan control and EIP-6963 refresh.
- Wallets now have a visible “Scan for wallets again” action. Rescan refreshes
  Solana Wallet Standard announcements and checks injected/EIP-6963 EVM
  providers, while preserving the existing connection recovery behavior.
  This is a discovery affordance, not universal wallet support. Responsive
  browser inspection covered 390x844; no provider interaction was performed.
- Web, Chrome MV3, and Android debug builds succeeded. Artifacts are in
  `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/`:
  - Web ZIP SHA-256: `4f79548b80b95074c71cf665668e0597e42ff3b591eac2a6a33b05763031efbe`
  - Chrome ZIP SHA-256: `047ca17a9bcbbfadce452a68826518c45ef74575bf420f181710f2afb6a9c658`
  - Android debug APK SHA-256: `06746c73942a7b2c5f46b987b395cba1985ba3bd4894969d8531bfc713e6d1a0`
- Android is still a target SDK 35 debug APK, not release-signed/F-Droid-ready.
  No physical device, biometric/passkey flow, or funded transaction was tested.

### Previous: r15 deployed

- r15 source commit `9aaa490` is pushed to `main` and deployed to the new AWS
  Amplify app `d2iwf2bo6lci0r` in `us-east-1` as job `9` (`SUCCEED`). The live
  root, runtime config, application JS, and styles returned HTTP 200. The live
  bundle contains the EVM account-change and Solana unregister handling.
- r15 keeps provider connection state in sync: Solana provider registration
  and removal are both observed; EVM account changes, chain changes, and
  disconnects update or clear the connected-wallet record. All three builds
  succeeded (web, Chrome MV3, Android debug). No wallet-funded transaction or
  physical-device test was performed.
- r15 artifacts are under `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/`:
  - Web ZIP SHA-256: `2f40abed373bae0963f75e27c3c36ad17847c4c3623706651bb5ce140dd33396`
  - Chrome ZIP SHA-256: `6163f3f28a328e68b0edceea49b13b262b4f35114290a080e924d668f6691185`
  - Android debug APK SHA-256: `68776f3b220cb4331fb90ec291c3d79ff3d56914e070f81116a544525411a94e`
- Android remains a debug APK using target SDK 35, not a release-signed
  F-Droid build. Browser installation, hardware-wallet and biometric/passkey
  journeys remain open work.

- r14 is deployed to Amplify app `d2iwf2bo6lci0r` in `us-east-1` by job `8`
  (SUCCEED, 2026-11-19). The public page and `/pdao-config.js` both returned
  HTTP 200; runtime config includes the Virginia agent gateway. The published
  app bundle includes the r14 native transfer flow.
- r13 added the live alpha movement card and mobile layout refinements. r14 adds
  native SOL and ETH sends for locally held and connected wallets: exact address
  validation, on-chain balance and fee estimate, local or wallet-provider
  approval, submission, and confirmation tracking. The wallet, Chrome MV3, and
  Android debug builds succeeded; source commit `f6da731` is pushed. No funded
  Mainnet send was performed, so transaction execution remains unverified.
- Current r14 artifacts are under
  `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/`:
  - Web ZIP SHA-256: `5e103a2a9c64c79c570431daf95f67d400ac5c7f43a62f1a50f519d622869938`
  - Chrome ZIP SHA-256: `061d7ae79bd52f1de05600000e213eca138297c580614d3314ef298aa56a0f52`
  - Android debug APK SHA-256: `8bdf112ebc4d1fe1aadbbebac625a47eb95f2e2de58a2c3b167c5aa4d9105a8a`
- Android uses `targetSdkVersion = 35`, `compileSdkVersion = 36`, and the new
  repo's Gradle project. It is a debug APK, not a release/F-Droid build.
- The currently published UI is r14. Descope gateway deployment is live;
  Descope Resource/client grants and scoped-token verification remain pending.

## Remaining work, in priority order

1. Finish the exact Descope Resource/client grant setup; verify scoped-token
   acceptance and rejection before enabling agent access.
2. Extend the protected gateway from identity introspection to real,
   least-privilege agent operations while keeping Stockholm x402 canonical.
3. Complete native SOL/ETH sending with local signing and confirmed receipts;
   complete Agent Exchange quote/job/receipt journeys.
4. Build actual trading-provider integrations and use provider execution
   evidence; keep external DApp handoff clearly separate.
5. Define the AI/trading subscription and commission contracts, then exact
   cross-currency PDAO conversion and treasury settlement.
6. Complete responsive/accessibility review across every section and
   360/390/768/1024/1440 widths.
7. Finish Chrome installation review; F-Droid metadata, release signing,
   reproducible build, and emulator/device validation.

See [product roadmap](product-roadmap.md), [identity design](identity-and-agent-auth.md),
[PRD](prd.md), and [release handoff](release-handoff.md) for details.
