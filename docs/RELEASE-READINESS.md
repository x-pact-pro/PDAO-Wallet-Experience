# PrivateDAO Wallet release readiness

This is the release gate for the unified wallet source. It describes verified
state, not intended state. A green build does not turn an unverified provider,
DNS cutover, funded settlement, or autonomous trading capability into a
production claim.

Latest reviewed source commit: `db18494`.

## One source of truth

| Surface | Source | Release rule |
|---|---|---|
| Web wallet | `PDAO-Wallet-Experience`, `main` | Deploy the reviewed commit to Amplify `d2iwf2bo6lci0r` in `us-east-1` |
| Chrome extension | `dist-extension/` from the same commit | Package separately; do not maintain a second implementation |
| Android | `android/` from the same commit | Build and sign separately; use the same `public/pdao-config.js` contract |
| Agent Exchange / PrivatePAY | `x-pact-pro/PrivateDAO-Agent-Exchange` | Consume its public API; do not duplicate x402 or signing logic in the wallet |

The older `x-pact-pro/PDAO-Wallet` repository and local prototypes are
comparison or recovery material only. They are not release sources.

## Identity and signing boundaries

- Auth0 authenticates human users. Its browser/native clients use PKCE and the
  wallet keeps tokens in memory.
- Web3Auth, MetaMask, and discovered wallets provide wallet access and signing.
  A wallet connection must never be treated as a human Auth0 session.
- Descope authenticates and authorizes machine agents at the AWS agent gateway.
  Descope bearer tokens must not be shipped in the SPA, extension, or Android
  bundle, and must not replace a user wallet signature or x402 authorization.
- Private keys and recovery phrases remain on the user device.

## Verified versus not yet proven

| Capability | Current state | Required evidence before claiming production-ready |
|---|---|---|
| Web/extension/Android shared source | Verified in this repository | Matching commit recorded on every artifact |
| Amplify web deployment | Latest reviewed job succeeded | Confirm live hostname serves that exact commit |
| Auth0 human sign-in | Configured for web and native clients | Verify production custom domain/callbacks and one-click provider flow |
| Web3/MetaMask wallet connection | Implemented | Device/browser matrix with connect, disconnect, chain change, and rejection tests |
| Alchemy balances and prices | Partially available | Successful multi-network read checks with provider fallback telemetry |
| Agent Exchange | Public API integration present | Confirm the selected AWS region and DNS route match the approved cutover |
| Descope agent gateway | Gateway authorizer exists; client policy/token acceptance is pending | Approved scoped client, positive/negative JWT tests, and audit evidence |
| PrivatePAY | Challenge/quote path available | Funded, user-approved settlement receipt on the supported rail |
| Human trading | Wallet-provider flows are available | Real quote, explicit wallet signature, receipt, and failure/replay tests |
| Autonomous trading | Not enabled; bot UI is fail-closed/manual approval | Separate delegated signer, limits, revocation, monitoring, and capped canary |
| Android release | Debug/device QA artifact exists | Release signing, reproducible build, install/upgrade test, and artifact checksum |
| Chrome extension release | Build source exists | Package review, permissions review, install/update test, and checksum |

## Region and DNS gate

The wallet UI must not silently switch Agent Exchange regions. The public
production route remains the source of truth until the following are all
recorded in one change:

1. Virginia and Stockholm pass the same API, x402, CORS, and rollback checks.
2. Virginia runs the approved Node.js runtime and has the required secrets and
   IAM permissions without copying secret values into source control.
3. `agents.privatedao.org` resolves to the approved target and HTTPS health,
   catalog, and PrivatePAY status checks pass through that hostname.
4. A rollback target remains available and the cutover is explicitly approved.

Until then, a Virginia standby function is not a Virginia production
deployment, and a provisioned custom domain is not proof of DNS cutover.

## Release decision

The source is unified and buildable, but the product is **not yet certified as
fully production-ready for autonomous funded trading**. The open gates above
are intentional safety gates, not disabled UI substitutes.
