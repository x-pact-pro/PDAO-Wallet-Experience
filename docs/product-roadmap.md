# Product roadmap

**Status:** 0/8 tasks complete
**Current Phase:** Foundation

## Phase 1 — Foundation
- [ ] Establish independent React/TypeScript app, product design tokens, build/lint/typecheck, and design documentation.
- [ ] Build welcome and responsive application shell with six primary sections and policy/legal footer.

## Phase 2 — Local custody
- [ ] Generate/import BIP39 wallet; derive Solana and EVM accounts; encrypt secret bundle with WebCrypto; lock/unlock/export flows.
- [ ] Read balances and send native assets with exact local signing and chain confirmation.

## Phase 3 — Live intelligence
- [ ] CoinGecko market tape, portfolio valuations, trending/momentum surfaces, stale/error states.
- [ ] Agent Exchange live catalog, filters, quote-first service jobs, status and receipt verification.

## Phase 4 — Payments and trading
- [ ] Canonical PrivatePAY status, exact quote, locally inspected/signed transaction, verification and settlement flow.
- [ ] Trading policy/vault/team/DApp sections; real route discovery and quote/sign/receipt execution where provider routes exist.

## Phase 5 — Identity and assistant
- [ ] Auth0 SPA integration with memory token cache and configured production callback; no private-key coupling.
- [ ] Ask PDAO API integration with visible quota/provider states and no embedded paid-provider keys.

## Phase 6 — Distribution
- [ ] Chrome MV3 build, permissions review, reproducible ZIP, and local smoke check.
- [ ] Capacitor Android app, F-Droid metadata, app icon/screenshots, SDK build, APK verification, and emulator/device check.
- [ ] Public GitHub source repository and Vercel production deployment on a new URL. Keep the existing wallet domain untouched.

## Phase 7 — Verification and handoff
- [ ] Desktop/mobile screenshots for every section, responsive/accessibility review, test/build checks, security boundary review.
- [ ] Verify published app and extension package; provide Android install artifact and F-Droid submission handoff.
