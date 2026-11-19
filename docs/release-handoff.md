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
