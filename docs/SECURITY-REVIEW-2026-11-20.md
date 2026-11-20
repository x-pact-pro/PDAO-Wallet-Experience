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
- The Android app module declares the distribution floor explicitly (`minSdkVersion 26`) in addition to the shared variables file; the rebuilt APK reports `sdkVersion 26` and `targetSdkVersion 35`.
- The rebuilt APK was installed on the connected device and `dumpsys package` reports `versionCode 2`, `versionName 0.1.1`, `minSdk 26`, and `targetSdk 35` for the single package `org.privatedao.wallet`.
- The Chrome Extension artifact preserves its directory structure and has been rebuilt as `PDAO-Wallet-Chrome-0.1.1-source-f601a3e.zip`; it remains wallet-only in extension runtime because the relative extension origin disables Auth0 redirect login.

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

The current allowlist is limited to the providers used by balances, quotes, Agent Exchange, and the Virginia wallet API. `wasm-unsafe-eval` is retained only for the embedded-wallet SDK compatibility path; removing it without testing that path can break wallet initialization. This remains a store-hardening item, not a reason to weaken signing or enable secrets in the extension.

### P2 — Marketplace publication remains out of scope

The accidental Seller Portal draft was removed from the wallet navigation and
route surface. AWS Marketplace registration, tax/banking verification, EULA,
fulfillment, entitlement/metering, Limited testing and AWS review remain
outside the wallet release surface.

## Current supported execution surface

- Human trading: Solana Jupiter swap with explicit wallet approval.
- Human transfers: native SOL and ETH flows with review and explicit signing.
- PrivatePAY: Solana Mainnet MagicBlock rail only.
- Agent Exchange: live catalog and read-only/quoted services.
- Autonomous trading: intentionally not enabled until the P0/P1 controls above are closed.

## Release gate

The product is not to be labeled fully production-ready for autonomous multi-network trading until all P0 and P1 findings have current runtime evidence. The current live web deployment is suitable for continued UX, identity, catalog and bounded human-flow testing.

## Verification snapshot

- `npm test`: passed, including Auth0 callback, onboarding, price formatting, and secret-boundary checks.
- `npm run typecheck`: passed.
- `npm run build:extension`: passed.
- Alchemy Ethereum Mainnet RPC probe: HTTP 200, chain id `0x1`; configured as
  the primary EVM balance/transfer endpoint with public fallbacks.
- `./gradlew :app:assembleDebug --offline`: passed; APK installed on the connected device with SDK floor 26 / target 35.
- Android artifact: `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/f82a567/PDAO-Wallet-Atelier-0.1.1-debug-sdk26.apk` (SHA-256 recorded beside the artifact).
- `git diff --check`: passed.
- Current authenticated human execution remains explicit and bounded; no automated strategy is permitted to submit a transaction without a scoped authorization, limits, expiry, replay protection, and a kill switch.
