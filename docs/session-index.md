# PDAO Wallet session index

Updated: 2026-11-19. This index reconciles the original brief with the current
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

## Current handoff (r13 build candidate; r12 deployed)

- Most recent published release is r12, deployed to Amplify by job `6`; the
  public page and runtime config returned HTTP 200.
- The current r13 design pass replaces the alpha hero’s decorative curve with
  the live 7-day series and a labeled 24-hour move, fixes the clipped chart on
  phone, expands the overview watchlist across the content width, and improves
  mobile reading sizes. Web, Chrome, and Android builds succeeded on Node
  26.13.1; source push and r13 Amplify release are pending.
- Current r13 artifacts are under
  `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/`:
  - Web ZIP SHA-256: `143f1217a24c94dee641fc8bf65ce752c96fbfa445227316de8085d67a843845`
  - Chrome ZIP SHA-256: `2731df07d0d1eefdeac0770f3c441b0bd764d44b4dd30076116c5283b2700621`
  - Android debug APK SHA-256: `87382097b455679a98364b6fdfda1665a69f0fe59266bcb019ae8d6c293362d9`
- Android uses `targetSdkVersion = 35`, `compileSdkVersion = 36`, and the new
  repo's Gradle project. It is a debug APK, not a release/F-Droid build.
- The currently published UI remains r12 until the r13 Amplify release. Descope gateway deployment is live;
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
