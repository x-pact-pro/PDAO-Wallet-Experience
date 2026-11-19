# Product roadmap

**Status:** Foundation and design surfaces built; commerce and distribution remain in progress.
**Current Phase:** Commerce and release readiness

## Phase 1 — Foundation
- [x] Establish independent React/TypeScript app, product design tokens, production build and design documentation.
- [x] Build an interactive welcome screen and responsive application shell with eight sections and policy/legal footer.
- [x] Implement a persistent compact desktop navigation state and route the support link to the new repository issue tracker (r17).
- [x] Add a keyboard-accessible quick navigation panel and remove the empty notification indicator (r18).
- [x] Keep every section within phone, tablet, and desktop viewport widths; add an in-card market preview scroll for the 320px layout (r19).

## Phase 2 — Local custody
- [x] Generate/import BIP39 recovery phrases; derive Solana and EVM addresses; encrypt the phrase locally with WebCrypto; verify the passphrase.
- [x] Zeroize the temporary plaintext recovery-phrase buffer in both successful and failed local wallet persistence paths (r20).
- [x] Discover injected Solana wallets and register Android Mobile Wallet Adapter through Wallet Standard.
- [x] Keep external wallet state synchronized: Solana registration/removal and EVM account, chain, and disconnect events (r15).
- [x] Provide a manual provider rescan for Wallet Standard Solana and injected/EIP-6963 EVM discovery (r16); support remains provider-dependent.
- [x] Read native SOL and ETH balances for local and connected addresses on the explicit Solana and Ethereum mainnets, with partial and unavailable states.
- [x] Implement native SOL/ETH send forms with exact preview, local/provider signing, submission, and confirmation polling (r14); funded Mainnet and Android device validation remain unverified.
- [x] Read SPL Token and Token-2022 balances for Solana wallets with partial RPC coverage states; unknown mints are shown by address and are not assigned names or prices.

## Phase 3 — Live intelligence
- [x] CoinGecko market tape, movement/volume sorting, local watchlist and unavailable states.
- [x] Agent Exchange live catalog and category/search filters. Quote-first service jobs and receipt verification remain open.

## Phase 4 — Payments and trading
- [x] Payer-bound PrivatePAY x402 requirements quote with a readable exact-terms review card.
- [x] Canonical status view, local transaction preparation and inspection, wallet signing, verification, explicit settlement confirmation, pending status handling, and confirmed provider receipt display.
- [x] Responsive Trading workspace surfaces: local policy preferences, encrypted local bot-secret vault, team profiles, and external DApp directory.
- [ ] Connect team profiles to authorized trading-agent APIs; add provider route discovery, quote/sign/receipt execution, and live status without exposing wallet secrets.
- [ ] Validate native SOL/ETH sending with an actual wallet provider and Android device; capture chain-confirmed receipts without misrepresenting build checks as funded E2E evidence.
- [ ] Add verified trade-provider routes (including meme-launch venues) with live provider quotes and user-controlled signing; do not label DApp launchers as bot execution.
- [ ] Define paid AI/trading plans and usage commissions, then implement automatic PDAO conversion and treasury settlement only through an exact quoted route, verified destination, and on-chain receipt. Agent Exchange prices remain live catalog data; PrivatePAY keeps its provider-defined terms.

## Phase 5 — Identity and assistant
- [x] Auth0 SPA integration uses a memory token cache on the new Amplify origin; Android uses a separate native client. No private-key coupling.
- [x] Descope agent security is branded and documented separately from Auth0 human sign-in; the Bots screen reports the actual rollout state.
- [x] Deploy a PDAO-owned AWS HTTP API with Descope issuer/audience validation and a route-level `agent.identity.read` requirement; missing bearer tokens return 401.
- [ ] Create the Descope API Resource and approved agent clients/policies; verify a real scoped token before enabling agent access. Existing Stockholm Agent Exchange/x402 endpoints remain on their current contract.
- [x] Ask PDAO API integration with conversation history, current service catalog, provider errors, and no embedded paid-provider keys.

## Phase 6 — Distribution
- [x] Chrome MV3 build and reproducible ZIP artifact. Browser installation review remains open.
- [x] Capacitor Android app shell, Android MWA registration, SDK debug build, and APK checksum.
- [x] F-Droid metadata draft and source-vendored Gradle recipe; Android release build succeeded from a clean clone.
- [ ] Validate with F-Droid tooling, complete maintainer review/eligibility, and submit.
- [ ] F-Droid main-repository eligibility/maintainer review, app icon and screenshots, plus emulator/device check.
- [x] Public GitHub source repository.
- [x] AWS Amplify deployment in `us-east-1` on a new app ID; GitHub Pages remains a secondary preview and the existing wallet domain is untouched.

## Phase 7 — Verification and handoff
- [x] Capture first-viewport mobile and desktop screenshots for all ten sections; verify no horizontal document overflow at 320, 360, 390, 768, 1024, and 1440 CSS pixels (r20 visual QA evidence).
- [x] Build web, Chrome MV3, and Android target SDK 35 debug packages from the same source (r20); verify the web package is live on the new Amplify app.
- [ ] Complete keyboard and assistive-technology accessibility review and security boundary review.
- [ ] Verify published app and extension package; provide Android install artifact and F-Droid submission handoff.
