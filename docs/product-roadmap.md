# Product roadmap

**Status:** Foundation and design surfaces built; commerce and distribution remain in progress.
**Current Phase:** Commerce and release readiness

## Phase 1 — Foundation
- [x] Establish independent React/TypeScript app, product design tokens, production build and design documentation.
- [x] Build an interactive welcome screen and responsive application shell with eight sections and policy/legal footer.

## Phase 2 — Local custody
- [x] Generate/import BIP39 recovery phrases; derive Solana and EVM addresses; encrypt the phrase locally with WebCrypto; verify the passphrase.
- [x] Discover injected Solana wallets and register Android Mobile Wallet Adapter through Wallet Standard.
- [x] Read native SOL and ETH balances for local and connected addresses on the explicit Solana and Ethereum mainnets, with partial and unavailable states.
- [ ] Send native assets with exact local signing and chain confirmation.
- [x] Read SPL Token and Token-2022 balances for Solana wallets with partial RPC coverage states; unknown mints are shown by address and are not assigned names or prices.

## Phase 3 — Live intelligence
- [x] CoinGecko market tape, movement/volume sorting, local watchlist and unavailable states.
- [x] Agent Exchange live catalog and category/search filters. Quote-first service jobs and receipt verification remain open.

## Phase 4 — Payments and trading
- [x] Payer-bound PrivatePAY x402 requirements quote with a readable exact-terms review card.
- [x] Canonical status view, local transaction preparation and inspection, wallet signing, verification, explicit settlement confirmation, pending status handling, and confirmed provider receipt display.
- [x] Responsive Trading workspace surfaces: local policy preferences, encrypted local bot-secret vault, team profiles, and external DApp directory.
- [ ] Connect team profiles to authorized trading-agent APIs; add provider route discovery, quote/sign/receipt execution, and live status without exposing wallet secrets.

## Phase 5 — Identity and assistant
- [x] Auth0 SPA integration uses a memory token cache on the new Amplify origin; Android uses a separate native client. No private-key coupling.
- [x] Descope agent security is branded and documented separately from Auth0 human sign-in; the Bots screen reports the actual rollout state.
- [ ] Enable agent authorization only after a PDAO-owned API Resource, scoped client policies, and server-side JWT audience/scope validation are deployed. Existing Stockholm Agent Exchange/x402 endpoints remain on their current contract.
- [x] Ask PDAO API integration with conversation history, current service catalog, provider errors, and no embedded paid-provider keys.

## Phase 6 — Distribution
- [x] Chrome MV3 build and reproducible ZIP artifact. Browser installation review remains open.
- [x] Capacitor Android app shell, Android MWA registration, SDK debug build, and APK checksum.
- [ ] F-Droid metadata/release signing, app icon and screenshots, plus emulator/device check.
- [x] Public GitHub source repository.
- [x] AWS Amplify deployment in `us-east-1` on a new app ID; GitHub Pages remains a secondary preview and the existing wallet domain is untouched.

## Phase 7 — Verification and handoff
- [ ] Desktop/mobile screenshots for every section, responsive/accessibility review, test/build checks, security boundary review.
- [ ] Verify published app and extension package; provide Android install artifact and F-Droid submission handoff.
