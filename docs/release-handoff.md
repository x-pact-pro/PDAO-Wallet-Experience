# Release handoff

## r29 — Virginia deployment and verified Descope resource

Source commit `3008c9b` binds the Agent Exchange UI to the verified Descope
resource metadata while keeping runtime agent authorization disabled until an
approved client policy and scoped-token acceptance test exist. The resource
was verified in the PrivateDAO production Descope project with:

| Field | Value |
|---|---|
| Resource | `PDAO Wallet Agent Gateway` (`RS3MMqZWGRlX86xgpf8MzQ30nqSJp`) |
| URI | `https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com` |
| Scope | `agent.identity.read` |
| User access | `deny` |
| Client access | `allowViaPolicy` |

The production resource exists, but no Descope client or scoped token is
claimed and `descope.enabled` remains `false`. Wallet keys remain browser or
device-only. This keeps the Virginia gateway integration explicit without
granting an agent access prematurely.

The build was manually deployed to Amplify app `d2iwf2bo6lci0r` in
`us-east-1` as job `52`; both DEPLOY and VERIFY succeeded. The public Amplify
root returned HTTP 200 and served the updated resource ID. The Stockholm Agent
Exchange Lambda and repository were not modified.

`npm run typecheck`, `npm test`, `npm run build`, `npm run build:extension`,
and `git diff --check` passed. Custom-domain DNS and the Auth0 production
callback remain separate release gates; the preview continues to use the
staging Auth0 environment until `wallet.privatedao.org` is verified.

## r28 — published Agent Exchange service routes

Source commit `63d4519cb98f441e990a4ea86622af9772d12066` adds safe links from
service cards to the Agent Exchange catalog's published HTTPS route when the
provider supplies `public_url`; cards without a valid HTTPS URL remain visibly
unpublished. No wallet key, signing authority, Descope token, or settlement
permission is sent to a provider.

The new Wallet Atelier web build was manually deployed to Amplify app
`d2iwf2bo6lci0r` in `us-east-1` as job `46`; both DEPLOY and VERIFY succeeded.
The public root returned HTTP 200 and the served bundle contains the route-link
implementation. The Stockholm Agent Exchange Lambda and repository were not
modified.

The r28 handoff artifacts are in
`/home/x-pact/Desktop/PDAO-Wallet-Deliverables/r28-0.1.1/`:

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Android-debug-0.1.1-20261120-r28.apk` | `46a3efa4f3d12b10ebc005385e90ae9d6b78c656a59c3c8bc9914a6eaa0bfb7d` | Target SDK 35 debug build; ADB device was unavailable during this pass |
| `PDAO-Wallet-Android-release-unsigned-0.1.1-20261120-r28.apk` | `16fce7baf637c63dd9ead2b12202276e485c5beb5ec5ebcc1c67a3dd38f49b69` | Target SDK 35 unsigned release build for F-Droid signing |
| `PDAO-Wallet-Chrome-0.1.1-20261120-r28.zip` | `a8f61bc3de708af064df2e7c8b2185f0600e7d1d8060aafa5a53c766c54f29f4` | MV3 extension package; build passed |

`npm run build`, `npm run lint`, `npm run build:extension`, Android asset sync,
offline Gradle debug/release builds, and `git diff --check` passed. Lint still
reports existing warnings from generated/vendor files and React purity rules;
there are no lint errors. No funded Mainnet transaction, Descope scoped-token
acceptance, Chrome Web Store publication, or F-Droid acceptance is claimed.

The repository now exposes the required verification commands directly as
`npm run typecheck` and `npm test`; both are backed by the TypeScript project
and the native Auth0 callback/price regression checks.

The Amplify custom-domain association for `wallet.privatedao.org` is present
but failed DNS verification because the registrar still delegates to
`dns1.registrar-servers.com` and `dns2.registrar-servers.com`. The correct
records already exist in the AWS Route 53 hosted zone: delegate the domain to
`ns-1088.awsdns-08.org`, `ns-2024.awsdns-61.co.uk`, `ns-690.awsdns-22.net`, and
`ns-291.awsdns-36.com`, or create equivalent records at the active registrar:
the wallet CNAME to `d3girmftahg4rp.cloudfront.net` plus the ACM validation
CNAME returned by Amplify. No registrar change was made automatically.

## r27 — live Team Bot route discovery

The Team Bots workspace now consumes the live Agent Exchange catalog when it
assigns a route to a specialist. Each profile stores only the selected public
service ID locally and shows whether its route was discovered; enabling a
profile without an assigned route is refused. Route discovery does not create
an agent client, issue a Descope token, sign a transaction, settle PrivatePAY,
or transmit wallet keys. The existing Descope Resource binding remains
pending and the Stockholm Agent Exchange contract is unchanged.

`npm run build`, `npm run build:extension`, and the offline Android debug build
passed after this change. The rebuilt APK was installed and launched on
device `R58T33JGLHN` (package `org.privatedao.wallet`, target SDK 35); after a
cleared crash buffer, no new Android crash was reported.

The r27 handoff artifacts are in
`/home/x-pact/Desktop/PDAO-Wallet-Deliverables/r27-0.1.1/`:

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Android-debug-0.1.1-r27.apk` | `b74677a40f52178f645e524c9244957601fe9cfb3c93fa3e77b3e49de28665c7` | Device-tested debug build |
| `PDAO-Wallet-Android-release-unsigned-0.1.1-r27.apk` | `5cf24704dc74c821d4552e9d944f0deb325fe99b352876bbecc4f12095b3ae51` | Target SDK 35, unsigned for F-Droid signing |
| `PDAO-Wallet-Chrome-0.1.1-r27.zip` | `851d1d3583707d97afb6de50d04570f5fd5fca0bf4906aa55812a5125e83e33e` | MV3 extension package, build passed |

## r26 — current F-Droid source recipe and distribution artifacts

The F-Droid recipe now pins the current source commit rather than the earlier
Android preview commit. The offline Gradle release build completed from the
tracked Android project with `223 actionable tasks` and exit 0. The resulting
unsigned release APK is not directly installable; F-Droid signs accepted
builds centrally.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Android-release-unsigned-0.1.1-r25.apk` | `5e8d6f4395219d2c8fb26b871b54665579d7afa423187521c138d9ca2503cc8c` | Release build, target SDK 35, unsigned |
| `PDAO-Wallet-Android-debug-0.1.1-r25.apk` | `6091a53c2afb18c1e2260f475d4ef097b04f45dffadc6a69e1c74e448726c660` | Debug build installed and launched on the connected device |
| `PDAO-Wallet-Chrome-0.1.1-r25.zip` | `98b95fa242f9f30d7f15821b70d9f564cf167c014ee0b317df0822081f41ae4d` | Root-level MV3 package; build passed |

Artifacts and `SHA256SUMS.txt` are in
`/home/x-pact/Desktop/PDAO-Wallet-Deliverables/r25-0.1.1/`. This does not
claim F-Droid acceptance or Chrome Web Store publication; both still require
their respective maintainer/store review.

## r25 — staging Auth0 release and physical Android launch verification

Source commit `329e1b2200f869be626d19d768c9087add232ec0` keeps the new
Atelier release explicitly marked `staging` while enabling the dedicated web
and native Auth0 clients for the new Amplify preview and Android testing. It
does not relabel the staging tenant as production, and the Chrome extension
continues to avoid an unconfigured Auth0 callback.

Amplify app `d2iwf2bo6lci0r` in `us-east-1` accepted the manual ZIP deployment
as job `34` and returned `SUCCEED`. The public root and `pdao-config.js`
returned HTTP 200; the served runtime config reports `environment: 'staging'`.
The Stockholm Agent Exchange was not changed.

The Android debug APK was rebuilt with target SDK 35, installed on the
connected physical device `R58T33JGLHN`, and launched successfully. The
package reports `org.privatedao.wallet`, `versionCode 2`, `minSdk 24`, and
`targetSdk 35`. A post-launch screenshot shows the interactive welcome screen;
the crash buffer was empty. Debug APK SHA-256:
`6091a53c2afb18c1e2260f475d4ef097b04f45dffadc6a69e1c74e448726c660`.

`npm run build`, `npm run build:extension`, `npm run lint`, the native Auth0
callback checks, and the price-format regression checks completed. Lint still
reports warnings from generated/vendor bundles and a small number of existing
React purity rules; no lint error was reported. Descope Resource binding and
client-token acceptance remain intentionally pending and `descope.enabled`
stays false.

## r24 — accurate small-asset prices and first physical-device evidence

Source `5156629` fixes the market ticker, overview, market table and alpha
price displays: nonzero prices below one dollar retain four significant digits;
prices below USD 0.00000001 use scientific notation. Invalid prices display an
unavailable marker. Portfolio totals retain their existing currency rounding.
`node --experimental-strip-types scripts/test-price-format.mjs`, TypeScript,
web and extension builds passed. Targeted lint passed; whole-project lint
returned warnings from bundled/vendored JavaScript.

Amplify app `d2iwf2bo6lci0r`, Virginia, job `18` succeeded. The public root,
runtime config, and all referenced JS/CSS assets returned HTTP 200; served
`index-GIvQj1ya.js` contains the corrected formatter. Web archive SHA-256:
`8f8fa287504c618416b98d34709e570b90bbb92ce005f279a57a2bf71aa41187`.
Chrome archive SHA-256:
`de672d0b2028575ee7069744ddf131ee711f53edaaeba497547a2940f8a1396b`.

The previous r23 debug APK is installed and opens on a Samsung SM-A235F,
Android API 34; installed package metadata confirms version 0.1.1, code 2,
target SDK 35. Native WebView captures of Markets, Overview and Wallets report
384px viewport and document width, without horizontal overflow. Evidence is
in `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/r23-device-review/`.
This review discovered the small-price rounding bug above. It does not prove
wallet-provider authorization, biometric authentication, or funded settlement.
The r24 Android debug and unsigned release builds completed successfully
(`421 actionable tasks`, exit 0). The phone disconnected before the updated APK
could be installed; r23 device evidence does not verify r24. Artifacts and
SHA256SUMS.txt are in `r24-0.1.1` beside the device captures. The Chrome ZIP is
published as GitHub preview `v0.1.1-preview.3` and its remote digest matches.
Debug APK SHA-256: `cd416a297a818576e79265cc8a4ef9284f855c1eb4172a25aefb36333fc7e671`.
Unsigned release SHA-256: `2a2ce8f05debb4a41710cc695c9354daeb974369823297c9ffb14a7cdb44ecff`.

## r23 — Auth0 environment guard and 0.1.1 cross-platform preview

Source `3e7c82b` keeps the development Auth0 tenant out of the official
`wallet.privatedao.org` origin, Android builds, and Chrome extension pages.
Wallet functionality remains available without Auth0. Version `0.1.1` uses
Android `versionCode 2`; F-Droid recipe `.fdroid.yml` pins source commit
`7171a01524cf4a172c1430350e72d5e62d4b091e`.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.1-r23.zip` | `a2fba9b0611a050392526bfbfadcfdeca5ec2fa29d50bdad03054e54d152ffe0` | Amplify manual deployment job `17` succeeded; published root/runtime/JS/CSS returned HTTP 200 |
| `PDAO-Wallet-Chrome-0.1.1-r23.zip` | `076c33736e46c7eefc48e919f8fa87077c97692d68da4d15198451256744e0a0` | GitHub preview release `v0.1.1-preview.2`; ZIP integrity verified |
| `PDAO-Wallet-Android-debug-0.1.1-r23.apk` | `630f30265c9ad5141e2f45ccbc812b44ff259fb19e730c9b295a2225d943d0a1` | Debug-signed, package metadata `org.privatedao.wallet`, target SDK 35 |
| `PDAO-Wallet-Android-release-unsigned-0.1.1-r23.apk` | `e4325ad4c666818772d4f46ff0270fe822784484d8b5c07079dc6c8958551c4e` | Unsigned release build for the source-build/F-Droid path; not directly installable |

Artifacts are in `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/r23-0.1.1/`.
Web, Chrome MV3, Android debug, and Android release builds succeeded. The
release manifest reports minimum SDK 24, target SDK 35, and version code 2.
Amplify app `d2iwf2bo6lci0r` deployed job `17` by direct ZIP upload because
the app has no Git provider connection. The live app is
`https://main.d2iwf2bo6lci0r.amplifyapp.com/`; the runtime config and all
hashed entry assets returned HTTP 200, and the published bundle contains the
distributed-app Auth0 environment guard. The original app, custom domain DNS,
and Stockholm Agent Exchange were not changed.
No Android device is attached, so no install, biometric, wallet-provider, or
screen-capture evidence is available. F-Droid `fdroid lint` 2.4.5 passed using
the official fdroiddata category and anti-feature definitions. The isolated
F-Droid build and repository submission remain open; Chrome Web Store
publication remains open. The Android release APK has no signing key and must
not be presented as installable.

## Current source and infrastructure status — 2026-11-19

### r22 — clean-clone Android source build and F-Droid metadata

Commit `d38902b7951e157e679ecb4f946fee1ed29e35f7` vendors the Capacitor
Android module sources and points Gradle at those tracked modules. The root
`.fdroid.yml` recipe points to that full source commit. `assembleRelease`
succeeded from a clean clone in 5m 38s with target SDK 35 and no npm packages
or per-project SDK path file. The APK hash differs from the local-tree build,
so this is source-build evidence rather than a bit-for-bit reproducibility
claim. It is unsigned and has not been installed on a device or submitted to
F-Droid.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Android-release-unsigned-0.1.0-20261119-r22.apk` | `fb4474c6acc0286e34da4261b35eb941b63b0124dd2962400640d943a498195a` | Clean-clone offline release build; unsigned; not directly installable |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r22.zip` | `85988f373b6ab61a3fc9d9c4d99660c902ccf9c3d52f5d76913ed07f045799a7` | GitHub prerelease `v0.1.0-preview.1`; ZIP integrity and isolated Chrome load verified |

The Chrome package is at
`/home/x-pact/Desktop/PDAO-Wallet-Deliverables/PDAO-Wallet-Chrome-0.1.0-20261119-r22.zip`.
It is published at [GitHub release v0.1.0-preview.1](https://github.com/x-pact-pro/PDAO-Wallet-Experience/releases/tag/v0.1.0-preview.1); GitHub reports the uploaded asset digest matches the local SHA-256.
The archive contains `manifest.json`, `index.html`, and `service-worker.js` at
its root. `npm run build:extension` succeeded; its expected notice says the
classic `pdao-config.js` cannot be bundled as a module. Chrome 153 loaded the
unpacked MV3 extension in a fresh temporary headless profile. The welcome
screen opened, navigation to Wallets worked, live prices loaded, and there
were no runtime exceptions. At 390x844, document and body widths were both
390px. Wallet discovery accurately showed zero Solana and EVM providers in
that clean profile and named undetected providers; no wallet was installed and
no signing was attempted. Screenshot:
`/home/x-pact/Desktop/PDAO-Wallet-Deliverables/QA-r22/chrome-sidepanel-wallets-390x844.png`
(SHA-256 `2414c73bb99ebe499f6e2e1a7ccaa5ca5f26d5702044ab8e9ce5c957f9cfd903`).
Chrome Web Store publishing and interaction with an installed wallet provider
remain open.

The original `x-pact-pro/PDAO-Wallet` remains paired with the original
Amplify app `d1yr54h1b2l04l` in `us-east-1`. This release belongs only to
`x-pact-pro/PDAO-Wallet-Experience` and the separate Wallet Atelier app
`d2iwf2bo6lci0r`.

The official hostname `wallet.privatedao.org` is intended for the Wallet
Atelier app. Amplify currently requests `wallet CNAME
d3girmftahg4rp.cloudfront.net`, while public DNS still resolves to
`d16o6udopifxas.cloudfront.net`; the domain association remains
`AWAITING_APP_CNAME`. No DNS record was changed in this release.

### r20 — local plaintext cleanup and distribution builds

`src/lib/walletVault.ts` now clears the temporary UTF-8 recovery-phrase buffer
in a `finally` block, including when encryption or IndexedDB persistence fails.
The existing local encryption format and wallet records are unchanged. Web,
Chrome MV3, and Android target SDK 35 debug builds completed successfully; no
test suite was run in this pass. The extension build still emits the known
Vite notice that `pdao-config.js` is intentionally a classic script and is
not bundled as a module.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r20.zip` | `a7ecb230820375bd24835567e6fbdab3d715beccf1fc37cce834234d994a961d` | Amplify job `16` succeeded; root/runtime/JS/CSS returned HTTP 200 |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r20.zip` | `492fe0ac74b96f2ad7ff2b2b06254a25c1ca1b3d165442631520568287917575` | Root-level MV3 package; ZIP verified; install interaction pending |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r20.apk` | `2c14fc0aa8e87d44f8537aa031deb811659af5db3d6957e6eca6765367116965` | Built; debug-signed, not F-Droid/release-signed |

Artifacts are in `/home/x-pact/Desktop/PDAO-Wallet-Deliverables/`. The
Android APK remains for local device review only; it is not a store release.
APK metadata confirms package `org.privatedao.wallet`, minimum SDK 24, target
SDK 35, and compile SDK 36. `apksigner` reports the Android debug certificate;
no Android device is currently attached. The Chrome archive has `manifest.json`
and `index.html` at its root, and its ZIP integrity check passed; extension
installation and live wallet-provider interaction remain unverified.
The first manual ZIP upload (job `15`) placed the `dist/` directory itself at
the hosting root and returned 404 there. The bundle was repacked with site
files at the archive root and redeployed as job `16`; the published root and
all referenced runtime and static assets then returned HTTP 200. The live
`walletVault` chunk contains the plaintext-buffer cleanup.

### r20 — all-section visual and responsive evidence

Captured the first viewport of all ten sections on the live Wallet Atelier
Amplify app at 390x844 and 1440x900 CSS pixels. A settled-view browser check
covered 320, 360, 390, 768, 1024, and 1440 CSS pixels across all ten sections;
in all 60 observations, document and body scroll widths equaled the viewport.
Browser page-error output was empty. The initial 390px Overview measurement
was sampled during React navigation and transiently reported a stale width;
after the route settled it measured 390px, matching the remaining sections.

The screenshot archive is
`/home/x-pact/Desktop/PDAO-Wallet-Deliverables/PDAO-Wallet-Visual-QA-20261119-r20.zip`
(SHA-256 `60d546ddbfc970f4a7fda72723d57f6d7ff120ba6473bd6bbcfc538f0d7561e2`).
This records layout and visual evidence only; keyboard/screen-reader
accessibility, wallet interactions, Chrome installation, and Android device
behavior remain unverified. No application code changed in this QA pass, so
the live deployment remains r19.

### Repository ownership

`x-pact-pro/PDAO-Wallet` is the original wallet repository associated with the
existing Amplify production app `d1yr54h1b2l04l` in `us-east-1`. This work is
being built separately in `x-pact-pro/PDAO-Wallet-Experience` (local checkout
`/home/x-pact/PDAO-Wallet-Atelier`) and its separate Amplify app
`d2iwf2bo6lci0r`. Keep the repositories and deployments distinct.

### r19 — narrow-screen layout corrections

Responsive inspection of all ten app sections at 320, 360, 390, 768, 1024,
and 1440 CSS pixels found and corrected intrinsic grid overflow in the Overview
cards and Agent Exchange layout. The Overview market preview now scrolls within
its own card on narrow screens. Every section's document width matched its
viewport at each inspected size. This is browser layout evidence; it does not
verify wallet signing, biometrics, payments, or native Android rendering.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r19.zip` | `26d5a0ac324d6b36d12b51f88d32cb77ee8e27bed951ec6c707e7acc68040337` | Amplify job `14` succeeded; live assets verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r19.zip` | `7ad9239966fdeca09ab3671755abd38331ab8aafaf82bd5bafdada8181865315` | Chrome MV3 build; ZIP integrity checked |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r19.apk` | `af7479c023c0377c284b5e31960a069eb1eed7bf3d9a4331d39a52539531e986` | Android target SDK 35 debug build; not release-signed |

Source commit `4683db5` is pushed to `x-pact-pro/PDAO-Wallet-Experience`.
The web build is live at
`https://main.d2iwf2bo6lci0r.amplifyapp.com/`; its public config and hashed
JS/CSS assets returned HTTP 200, and the served CSS contains the r19 responsive
rules. The production hostname remains routed to the original wallet app until
the pending Namecheap CNAME change is completed.

### r18 — quick navigation and truthful alerts

Source commit `305f829` adds the Ctrl/⌘+K quick-navigation panel and removes
the empty notification bell. Web, Chrome MV3, and Android target SDK 35 debug
builds passed. Amplify manual deployment job `13` (`SUCCEED`) published the web
build to app `d2iwf2bo6lci0r` in `us-east-1`; the live root, runtime config, JS,
and CSS returned HTTP 200. The served JS includes the quick-navigation label
and keyboard hint, and does not contain the former empty-alert message.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r18.zip` | `8f5d27c8f551dc8adb9af1c8e924601da06cb2a9ae2264dfc0ebc8ed5652e19b` | Amplify job `13` deployed; live assets verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r18.zip` | `8a2930e86c0a6b39dc03d860c10c29afbc8e67406c991f545711e3c972da3486` | Chrome MV3 build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r18.apk` | `a76936d72befdd40365b921da64ac48be86ac595979f11503050b20275f0ecfe` | Android target SDK 35 debug build |

No browser screenshot, installed extension interaction, Android device,
biometric flow, or funded transaction was verified in this release.

### r17 — functional workspace controls

Source commit `6ded40b` adds a persistent compact sidebar for desktop and
replaces the placeholder support toast with the Wallet Experience issue
tracker. Web and Chrome MV3 production builds and an Android target SDK 35
debug build passed. The web bundle was deployed to Amplify app
`d2iwf2bo6lci0r` in `us-east-1` using manual deployment job `12` (`SUCCEED`).
The live root, runtime config, JS, and CSS returned HTTP 200; the JS contains
the compact-sidebar behavior and support destination.
These builds do not verify device-only wallet or biometric flows. The
headless-browser preview attempt did not produce a fresh screenshot, so this
change has build evidence but no new rendered UI capture.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r17.zip` | `a257c6e2ce80c59cd368e4b4dac698a97a88cb54c5ce0a7d1cb5575fd16bec3c` | Amplify job `12` deployed; live assets verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r17.zip` | `731ce7e9369689cc4e3e16ad4e0044ac9e73297f2e6d627ad33c1f7a0ab4cd3e` | Chrome MV3 build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r17.apk` | `c535a7a66e81233f7d08d5be3862910bd830c1aac1b0c14ec24d72a44b73e556` | Android target SDK 35 debug build |

The official custom hostname remains unresolved pending the Namecheap DNS
change described below.

### Official hostname routing

The existing `x-pact-pro/PDAO-Wallet` repository is the source for the original
Virginia Amplify app `d1yr54h1b2l04l` and its code was not changed. The new
`PDAO-Wallet-Experience` source uses app `d2iwf2bo6lci0r`; its r17 deployment
is live at the app's `amplifyapp.com` hostname. The intended custom-domain
target is the new application.

The new Amplify association is `PENDING_VERIFICATION`, waiting for Namecheap to
set `wallet CNAME d3girmftahg4rp.cloudfront.net`. Namecheap still publishes the
prior distribution target. The Route 53 hosted zone is not delegated for
`privatedao.org`, so changes there do not update public DNS. Auth0's Atelier
web client has the official callback/origin/logout URLs; the older PDAO Wallet
Auth0 client is unchanged.

### r16 — manual wallet-provider rescan

Source commit: `b27218d` on `main`; deployed to AWS Amplify Virginia
(`us-east-1`) with manual job `10` (`SUCCEED`). The public root and
`/pdao-config.js` returned HTTP 200. The live JavaScript and CSS assets also
returned HTTP 200, and the application bundle contains “Scan for wallets again”
and `eip6963:requestProvider`.

The Wallets workspace offers a manual rescan for Solana Wallet Standard and
injected/EIP-6963 EVM providers, including silent recovery of prior provider
authorization. Desktop/mobile browser UI inspection included 390x844; no wallet
provider was connected or interacted with. Provider availability depends on
the browser/extension and chain support.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r16.zip` | `4f79548b80b95074c71cf665668e0597e42ff3b591eac2a6a33b05763031efbe` | Amplify job `10` deployed; live JS/CSS verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r16.zip` | `047ca17a9bcbbfadce452a68826518c45ef74575bf420f181710f2afb6a9c658` | Chrome MV3 production build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r16.apk` | `06746c73942a7b2c5f46b987b395cba1985ba3bd4894969d8531bfc713e6d1a0` | Android SDK 35 debug build; not release-signed |

No funded transaction, connected-wallet interaction, physical-device test,
or biometric/passkey journey was performed.

### r15 — live wallet-provider state

Source commit: `9aaa490` on `main`; deployed to AWS Amplify Virginia
(`us-east-1`) with manual deployment job `9` (`SUCCEED`). The published root,
runtime config, JavaScript, and CSS returned HTTP 200; the live application
bundle contains the provider lifecycle updates.

Solana discovery now refreshes on both Wallet Standard registration and
unregistration. EVM connections follow `accountsChanged`, `chainChanged`, and
`disconnect`, updating the connected account/network or clearing stale
connections. The web, Chrome MV3, and Android debug builds succeeded. This is
build and hosting verification; it does not claim a funded transaction or
physical Android device validation.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r15.zip` | `2f40abed373bae0963f75e27c3c36ad17847c4c3623706651bb5ce140dd33396` | Amplify job `9` deployed; live assets verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r15.zip` | `6163f3f28a328e68b0edceea49b13b262b4f35114290a080e924d668f6691185` | Chrome MV3 production build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r15.apk` | `68776f3b220cb4331fb90ec291c3d79ff3d56914e070f81116a544525411a94e` | Android SDK 35 debug build; not release-signed |

### r14 — native SOL and ETH sends

Source commit: `f6da731` on `main`; deployed on AWS Amplify Virginia
(`us-east-1`) with job `8` (`SUCCEED`). The application root and runtime
configuration returned HTTP 200, and the published application JavaScript
contains the native transfer workflow.

The shared Wallets screen now supports native SOL and ETH sends from locally
encrypted wallets and connected wallet providers. It checks the destination,
network, balance and current fee estimate, requires local signing or wallet
provider approval, broadcasts through public RPC endpoints, and waits for an
on-chain confirmation/receipt. No funded Mainnet transaction or Android device
transaction was performed; this release verifies compilation and deployment,
not a successful transfer.

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r14.zip` | `5e103a2a9c64c79c570431daf95f67d400ac5c7f43a62f1a50f519d622869938` | Amplify job `8` deployed; live bundle verified |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r14.zip` | `061d7ae79bd52f1de05600000e213eca138297c580614d3314ef298aa56a0f52` | Chrome MV3 production build |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r14.apk` | `8bdf112ebc4d1fe1aadbbebac625a47eb95f2e2de58a2c3b167c5aa4d9105a8a` | Android SDK 35 debug build; not release-signed or F-Droid-ready |


The product in this repository is the new Wallet Atelier project, separate from
the existing wallet in `x-pact-pro/PDAO-Wallet`. Its production web deployment
is AWS Amplify app `d2iwf2bo6lci0r` in `us-east-1` at
https://main.d2iwf2bo6lci0r.amplifyapp.com/. This supersedes the earlier r7
handoff statement that the new app had no production URL. Vercel is not the
deployment target. GitHub Pages is a secondary preview only.

Previous packaged artifacts for the r13 design pass (built on Node 26.13.1;
web deployed to Amplify job `7`, status `SUCCEED`, in `us-east-1`):

| Artifact | SHA-256 | State |
|---|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r13.zip` | `143f1217a24c94dee641fc8bf65ce752c96fbfa445227316de8085d67a843845` | Published to Amplify job `7`; page and runtime config HTTP 200 |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r13.zip` | `2731df07d0d1eefdeac0770f3c441b0bd764d44b4dd30076116c5283b2700621` | MV3 package |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r13.apk` | `87382097b455679a98364b6fdfda1665a69f0fe59266bcb019ae8d6c293362d9` | Debug APK, target SDK 35; not release-signed |

A separate Descope agent identity gateway is deployed from
`infra/agent-gateway/template.yaml` to AWS `us-east-1`:
`https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com`. `/health` returned
200 and `GET /v1/agent/identity` returned 401 without a token. The Descope
Resource and agent clients are not yet configured, so a valid scoped token has
not been accepted. The gateway status UI remains explicit about the pending Descope Resource/client
grants. r14 is live at https://main.d2iwf2bo6lci0r.amplifyapp.com/; the root page and `/pdao-config.js` both returned HTTP 200.

For the complete project map and remaining objective checklist, see
[`session-index.md`](session-index.md).

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

## Public hosting

The current web app is published on GitHub Pages at
https://x-pact-pro.github.io/PDAO-Wallet-Experience/. A GitHub Actions workflow
rebuilds and deploys the `main` branch. Pages is configured for HTTPS. The
first deployment run (`44450268297`) completed successfully and the public
root and runtime configuration both returned HTTP 200. The existing wallet
domain remains untouched.

## Build r9 — Solana token balances

Source commit: `81a54a7` on `main`.

Adds read-only balances for both the original SPL Token program and Token-2022.
Balances aggregate by mint across local and connected Solana addresses. Unknown
mints are identified by their shortened on-chain address; no unverified token
name, logo, or dollar price is invented. Partial coverage is surfaced when an
RPC cannot read one or more wallet/program combinations.

Web, Chrome MV3, and Android debug builds all succeeded with Node 26 and the
local Android toolchain. Android remains debug-signed and has not been checked
on a physical device; these builds do not constitute an F-Droid release.

| Artifact | SHA-256 |
|---|---|
| `PDAO-Wallet-Web-0.1.0-20261119-r9.zip` | `68e23d2e7f08caa2a9b4a0c61c78bcb2548f3cf9aa0ed52752bc9507dcad9d31` |
| `PDAO-Wallet-Chrome-0.1.0-20261119-r9.zip` | `6548f8df74e7fda893f154855b4543d044ba7881a5854f4c36bafe3538fa3b94` |
| `PDAO-Wallet-Android-debug-0.1.0-20261119-r9.apk` | `0f39856f5dd19c1e0d1bbd98722980884ece31d7edf5d6a1160d6cb7bd54c60a` |

## Build r8 — portfolio balance reads

Source commit: `badaa67` on `main`.

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

## Build r29 — Agent Exchange service execution surface

This build adds a live service detail journey backed by the published Agent
Exchange contract: JSON input validation at the UI boundary, free-service job
creation, paid exact-quote creation, bounded job-status polling, and receipt
links when the provider returns one. Paid requests remain quote-first; this
change does not sign, settle, or claim funded payment evidence.

The web deployment target remains the new Amplify application in `us-east-1`.
The Stockholm Agent Exchange Lambda is an external provider and was not
modified.

Artifacts:

| Artifact | SHA-256 |
|---|---|
| `PDAO-Wallet-Android-debug-0.1.1-20261120-r29.apk` | `46a3efa4f3d12b10ebc005385e90ae9d6b78c656a59c3c8bc9914a6eaa0bfb7d` |
| `PDAO-Wallet-Android-release-unsigned-0.1.1-20261120-r29.apk` | `16fce7baf637c63dd9ead2b12202276e485c5beb5ec5ebcc1c67a3dd38f49b69` |
| `PDAO-Wallet-Chrome-0.1.1-20261120-r29.zip` | `80f458bdc51fc326f68fd60aa02ed53d478b7d341b0afa9a0e87554cc4b25ab9` |

Amplify manual deployment job `49` completed `DEPLOY=SUCCEED` and
`VERIFY=SUCCEED` in `us-east-1`. The public default host returned HTTP 200.
