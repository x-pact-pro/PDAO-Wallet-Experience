# Product roadmap

**Status:** Foundation and design surfaces built; commerce and distribution remain in progress.
**Current Phase:** Commerce and release readiness

## Phase 1 — Foundation
- [x] Establish independent React/TypeScript app, product design tokens, production build and design documentation.
- [x] Build an interactive welcome screen and responsive application shell with eight sections and policy/legal footer.

## Phase 2 — Local custody
- [x] Generate/import BIP39 recovery phrases; derive Solana and EVM addresses; encrypt the phrase locally with WebCrypto; verify the passphrase.
- [ ] Read balances and send native assets with exact local signing and chain confirmation.

## Phase 3 — Live intelligence
- [x] CoinGecko market tape, movement/volume sorting, local watchlist and unavailable states.
- [x] Agent Exchange live catalog and category/search filters. Quote-first service jobs and receipt verification remain open.

## Phase 4 — Payments and trading
- [ ] Canonical PrivatePAY status, exact requirements quote, locally inspected/signed transaction, verification and settlement flow. The current app requests and displays requirements only.
- [ ] Trading policy/vault/team/DApp sections; real route discovery and quote/sign/receipt execution where provider routes exist.

## Phase 5 — Identity and assistant
- [ ] Auth0 SPA integration uses a memory token cache; enable it after the new production callback is allowlisted. No private-key coupling.
- [ ] Descope is reserved for agent identity and authorization, separate from Auth0 human sign-in. Add scoped Resource/MCP validation to the Agent Exchange before enabling it.
- [ ] Ask PDAO API integration with visible quota/provider states and no embedded paid-provider keys.

## Phase 6 — Distribution
- [x] Chrome MV3 build and permission review. Reproducible ZIP and browser installation review remain open.
- [ ] Capacitor Android app, F-Droid metadata, app icon/screenshots, SDK build, APK verification, and emulator/device check.
- [ ] Public GitHub source repository and Vercel production deployment on a new URL. Keep the existing wallet domain untouched.

## Phase 7 — Verification and handoff
- [ ] Desktop/mobile screenshots for every section, responsive/accessibility review, test/build checks, security boundary review.
- [ ] Verify published app and extension package; provide Android install artifact and F-Droid submission handoff.
