# PrivateDAO Wallet

A new, independent PrivateDAO wallet experience for the web, Chrome side panel, and Android. The interface combines local self-custody setup, live market data, alpha views, Agent Exchange discovery, and a wallet-signed PrivatePAY x402 flow.

## Current state

- Live market prices and Agent Exchange catalog are fetched from their providers; unavailable data is shown as unavailable.
- Recovery phrases are encrypted on-device with Web Crypto before they are stored in IndexedDB.
- Bots includes responsive Policy, encrypted Vault, Team Bots, and DApp Browser tabs. Policies and team profiles are local settings only; they do not execute trades or enable production Autopilot.
- PrivatePAY requests payer-bound x402 requirements, prepares the provider transaction, signs on-device, submits it for verification, and requests settlement only after explicit confirmation. Pending/provider-unavailable responses remain pending; only a confirmed provider result is shown as settled.
- The browser wallet phrase and private key remain local. The facilitator receives the signed payment transaction for verification and settlement.
- Solana swaps use live Jupiter quotes and require a user signature in the selected wallet. PrivatePAY requests an exact provider quote and requires explicit approval before settlement.
- Auth0 is enabled for this independent app with memory-only browser token storage and a separate native Android client. It does not receive wallet secrets.
- Ask PDAO uses the existing AWS wallet AI endpoint in `us-east-1`; the API keeps its guardrail, source checks, and request quotas. It receives the current public service catalog, never wallet keys.
- Descope remains separate for agent identity and scoped MCP/resource access; it is not used as a human login substitute for Auth0.
- A PDAO-owned agent identity API is deployed in AWS Virginia with a Descope JWT authorizer and per-route scope enforcement. Descope Resource/client setup and valid-token acceptance remain pending; see `docs/identity-and-agent-auth.md`.
- Agent Exchange catalog prices are read from the live provider. Trading/AI subscriptions, usage commissions, automatic PDAO conversion, and treasury settlement are not enabled until their provider quotes, conversion route, and treasury contract are confirmed.
- The Chrome extension is a Manifest V3 side panel. Android uses Capacitor and keeps its web bundle local.
- The workspace navigation can be compacted on desktop and remembers the choice. Help links to the active source issue tracker.

## Development

```sh
npm ci
npm run dev
npm run build
npm run build:extension
npm run android:sync
```

Android build:

```sh
cd android
./gradlew assembleDebug
```

## Distribution

The web app is hosted in AWS Amplify `us-east-1` at https://main.d2iwf2bo6lci0r.amplifyapp.com/. GitHub Pages remains a secondary preview. See `fastlane/metadata/android/en-US` for the F-Droid listing draft. Android builds are debug APKs until signed for release.

## License

Application source code is MIT licensed. PrivateDAO names, logos, and supplied brand artwork remain trademarks and brand assets; this license does not grant rights to use them outside this application.
