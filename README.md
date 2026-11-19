# PrivateDAO Wallet

A new, independent PrivateDAO wallet experience for the web, Chrome side panel, and Android. The interface combines local self-custody setup, live market data, alpha views, Agent Exchange discovery, and a quote-first PrivatePAY entry point.

## Current state

- Live market prices and Agent Exchange catalog are fetched from their providers; unavailable data is shown as unavailable.
- Recovery phrases are encrypted on-device with Web Crypto before they are stored in IndexedDB.
- Bots includes responsive Policy, encrypted Vault, Team Bots, and DApp Browser tabs. Policies and team profiles are local settings only; they do not execute trades or enable production Autopilot.
- PrivatePAY requests payer-bound x402 requirements from the selected local Solana wallet and presents the exact quote, recipient, network, settlement rail, and expiry. Local transaction preparation, signing, verification, and settlement are not yet connected in this version.
- Wallet signing and trade execution are not enabled yet.
- Auth0 is staged and disabled until the new production origins are allowlisted. Descope is reserved for machine and agent authorization; scoped API/MCP enforcement still needs to be wired and enabled.
- The Chrome extension is a Manifest V3 side panel. Android uses Capacitor and keeps its web bundle local.

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

See `fastlane/metadata/android/en-US` for the initial F-Droid listing text. A public source URL, release signing process, device screenshots, and F-Droid metadata review are still required before submitting a release.

## License

Application source code is MIT licensed. PrivateDAO names, logos, and supplied brand artwork remain trademarks and brand assets; this license does not grant rights to use them outside this application.
