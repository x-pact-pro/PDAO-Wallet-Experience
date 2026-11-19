# Release handoff

## Build r7 — 2026-11-19

Source commit: `924eb6d8a6a9fc6e57feb4bba7c7b4246f94b370` on `main`.

Artifacts are created locally under `~/Desktop/PDAO-Wallet-Deliverables/`:

| Artifact | SHA-256 | Status |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r7.zip` | `e07552b7af84b9e306c9c78601420e587b68f6f6f2ebf6d0a004bbda5c550f76` | Production web build; ZIP integrity checked |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r7.zip` | `63ecd2c94a127dcac3ae08c83dd37512b0b7bfa38883d08a0c7e09eaa40a32ec` | MV3 extension package; ZIP integrity checked |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r7.apk` | `d2cb708870fd83bae0e96cc22d6d409714a93506c239c8a2c0a7e0aebfeb9a7a` | Debug-signed APK; Gradle build succeeded |

Both web builds completed with Node 26. Android assets were synchronized with
Capacitor before `assembleDebug`. No Android device or emulator was attached,
so installation, MWA wallet discovery, and transaction signing have not been
device-verified. The APK is not a release-signed F-Droid submission.

The Vercel team grant has not been approved yet; there is no production URL for
this new app at this handoff. The existing wallet domain was not changed.

## Build r8 — portfolio balance reads

This build adds native SOL and ETH balance reads with explicit mainnet labels,
partial/unavailable states, and RPC provider fallback. It does not include
SPL/ERC-20 token indexing or native transfer flows.

| Artifact | SHA-256 | Status |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r8.zip` | `ea02af002fd4a7f089adbe2e81b62c7378016be3a9a0d8bf9d9605236c460b9f` | Web build; ZIP integrity checked |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r8.zip` | `498b14fc97fc2fa7908b45afe2b2d9ab4ac5930e2ff7cc88e193766c82f8a190` | MV3 package; ZIP integrity checked |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r8.apk` | `8a03b476a1165cbeb6f12277c39ad4b2b33f535171885491912ad8041357eefa` | Debug APK; Gradle build succeeded |

Web and extension builds both passed with Node 26. Capacitor synced the
production web assets before the Android Gradle build. Mainnet balance reads
were probed against live Solana and Ethereum RPC endpoints without signing or
submitting transactions. Public RPCs are rate-limited and have no production
SLA. No emulator/device was attached, so UI balance rendering and Android MWA
remain unverified on a physical device.
