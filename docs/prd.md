# Product requirements — PrivateDAO Wallet Atelier

**Status:** In progress

## Objective

Build a new self-custody wallet as a React/TypeScript application, distributed as a web app, Chrome MV3 extension, and Android app. This repository is independent and starts from a blank Vite scaffold. The canonical PrivatePAY and Agent Exchange APIs remain the only payment authority.

## Core journeys

1. Welcome → create or import a wallet → encrypt locally → see live portfolio.
2. Portfolio → inspect live holdings/quotes → receive, send, or swap after reviewing and signing the exact transaction locally.
3. Agent Exchange → browse/filter live services → run free capability or request exact paid quote → inspect terms → sign on device → verify execution and receipt.
4. Payments → inspect current PrivatePAY status → request a fresh quote → inspect MagicBlock terms → sign locally → submit/verify through the canonical contract.
5. Markets → explore current price, change, liquidity/volume, trending assets, and alpha evidence with source/time labels.
6. Trading → save a local risk policy, discover external DApps, and use explicit local authorization for each transaction. No trade is reported as live unless a chain receipt proves it.
7. Assistant → authenticated API call where configured; provider credentials remain local and are never embedded in the public build.

## Screens

- Interactive welcome and onboarding.
- Portfolio.
- Agent Exchange.
- Payments / PrivatePAY.
- Trading policy, vault, team-bot structure, and external DApp launcher.
- Markets / alpha.
- Ask PDAO.
- Terms, privacy, security, and settings.

## Requirements

- Responsive behavior at 360, 390, 768, 1024, and 1440 CSS px.
- Solana Mainnet and EVM networks are explicit; unsupported routes cannot silently reuse another network's price or signing path.
- BIP39 secret material and encrypted vault stay client-side. No network request contains mnemonic, seed, or private key.
- Exact transaction preview and user-controlled confirmation precede signing. Show authoritative confirmation only after chain/provider evidence.
- Runtime configuration uses public non-secret values. No `.env` file is created by this plan.
- Data UI names source, last update, and stale/unavailable states.
- F-Droid source must be public, MIT licensed, reproducibly buildable, and include a native Android shell with clear value beyond a website wrapper.
- Browser extension uses MV3, least permissions, no background key access, and local wallet origin storage.
- Every feature has loading, error, empty, and success states; keyboard/focus and reduced motion are supported.

## Explicit exclusions

- No fabricated prices, users, alpha, bot executions, receipts, or transaction outcomes.
- No automatic transaction signing, key upload, guessed treasury, hidden conversion rate, or blind pay-and-forward.
- No Agent Exchange or Lambda source changes.
