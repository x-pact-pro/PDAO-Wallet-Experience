# PrivateDAO Wallet security and operations review

Date: 2026-11-20  
Scope: PDAO Wallet Experience web SPA, Chrome Extension build, Android Capacitor application, Auth0, Web3Auth, Descope boundary, Agent Exchange and PrivatePAY integration.

## Evidence reviewed

- `src/main.tsx`, `src/App.tsx`, `src/lib/authCallback.ts`
- `src/lib/walletVault.ts`, `src/lib/externalWallets.ts`, `src/lib/embeddedWallet.ts`
- `android/app/src/main/AndroidManifest.xml`, `android/variables.gradle`
- `public/manifest.json`, `public/pdao-config.js`
- Auth0 callback boundary and security boundary tests
- TypeScript, lint, web build, Chrome Extension build and Android debug build
- Read-only Agent Exchange PrivatePAY status

## Confirmed controls

- Auth0 is the human identity provider; Web3Auth and external wallet providers are separate wallet entry points.
- Native Auth0 callback handling has a deduplication guard and the Auth0 provider skips a second native callback pass.
- Browser Auth0 tokens use memory cache; wallet recovery material is not submitted through `fetch` or Auth0.
- Local wallet records use AES-GCM with a PBKDF2-derived key and a random salt/IV.
- Solana transaction signing checks the selected payer and the transaction signer set before signing.
- PrivatePAY follows quote → prepare → local/external signing → verify → explicit settlement.
- Android cleartext traffic is disabled except for localhost and backup is disabled.
- Android minimum SDK is now 26; target SDK remains 35.
- External wallet discovery supports Wallet Standard and EIP-6963 rather than assuming Phantom.

## Findings

### P0 — Do not enable autonomous trading yet

The live PrivatePAY capability is verified for Solana only. Base and Robinhood Chain do not have independently verified private payment rails in the current status response. The UI must not advertise or route autonomous trading to those networks.

Required closure: a real per-network quote, signer, allowlist, limits, replay protection, kill switch and bounded canary for every enabled network.

### P1 — Android production signing is still a release operation

The debug APK builds and installs, but no production signing key is stored in the repository. A release signing configuration must be supplied through the protected build environment before distributing a production APK. Never commit the keystore or password.

### P1 — Agent identity runtime is not enabled

The Descope resource is present, but the runtime flag is disabled until a scoped client policy and audience/scope verification are tested. This is correct fail-closed behavior, not a missing UI switch.

### P1 — Google sign-in needs a live device E2E test

The duplicate callback guard is covered by source tests, but a real Google account flow must still be exercised on the connected Android device: account selection, consent, native callback, one session, and return to the wallet without a second Auth0 prompt.

### P1 — Production hostname and Auth0 callback alignment

The intended hostname is `wallet.privatedao.org`, while the currently verified Amplify URL is `main.d2iwf2bo6lci0r.amplifyapp.com`. Both origins must be present in the Auth0 allowed callback/origin configuration until the custom hostname is actually active. DNS must not be changed implicitly.

### P2 — Chrome Extension hardening

The extension uses `wasm-unsafe-eval` for wallet SDK compatibility and has several provider host permissions. Before store publication, minimize host permissions and image/network sources to the exact providers used by the release. Keep all extension authentication wallet-only unless an explicit extension callback is tested.

### P2 — Seller Portal is preparation, not publication

The Seller Portal is now live as a preparation workspace. It does not claim AWS Marketplace publication, create a seller account, change pricing, or submit a product. AWS registration, tax/banking verification, EULA, fulfillment, entitlement/metering, Limited testing and AWS review remain seller-controlled steps.

## Current supported execution surface

- Human trading: Solana Jupiter swap with explicit wallet approval.
- Human transfers: native SOL and ETH flows with review and explicit signing.
- PrivatePAY: Solana Mainnet MagicBlock rail only.
- Agent Exchange: live catalog and read-only/quoted services.
- Autonomous trading: intentionally not enabled until the P0/P1 controls above are closed.

## Release gate

The product is not to be labeled fully production-ready for autonomous multi-network trading until all P0 and P1 findings have current runtime evidence. The current live web deployment is suitable for continued UX, identity, catalog and bounded human-flow testing.
