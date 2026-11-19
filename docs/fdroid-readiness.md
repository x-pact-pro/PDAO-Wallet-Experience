# F-Droid build readiness

## Source build path

The Android project uses Capacitor. `npm run android:sync` builds the web
runtime, runs `npx cap sync android`, and vendors the required Capacitor Android
project sources from npm into `android/capacitor-*`. The synchronized runtime,
plugin metadata, Cordova bridge project, and four Gradle module sources are
tracked in Git. The F-Droid Gradle step can therefore resolve local Capacitor
projects without `node_modules` or npm access.

The root `.fdroid.yml` describes version `0.1.0` (`versionCode: 1`) and uses
`android/` with Gradle's release task. Its build commit is the full source SHA
`d38902b7951e157e679ecb4f946fee1ed29e35f7`. An offline `assembleRelease`
build from a clean clone of that commit succeeded with Android SDK 35/36
installed locally and without `node_modules` or a project `local.properties`.
This verifies the tracked Gradle source path; it is not a bit-for-bit
reproducibility claim or an F-Droid build-server run.

## Current release state

- Package ID: `org.privatedao.wallet`.
- Minimum SDK 24, target SDK 35, compile SDK 36.
- The source includes an English app listing draft and launcher icon under
  `fastlane/metadata/android/en-US/`. Store screenshots still need review and
  capture from an Android device/emulator.
- The debug APK remains available for device installation. The release APK is
  unsigned (`app-release-unsigned.apk`); it is not directly installable. F-Droid
  signs accepted builds centrally.
- No F-Droid submission has been made. Main-repository inclusion requires
  maintainer review of dependencies, external services, source history, and
  build output. The repository was created on 2026-11-18, so it does not yet
  meet the current three-month active-development period unless maintainers
  accept a documented policy exception.
- Main-repository builds are signed by F-Droid. A separate repository would
  require a separately managed release signing key and update continuity.
- The metadata declares `NonFreeNet` because some wallet features rely on
  hosted external services and APIs.
- A first clean-clone attempt exposed Gradle settings pointing into ignored
  `node_modules` projects. The source-vendoring fix in
  `d38902b7951e157e679ecb4f946fee1ed29e35f7` resolved it; the clean clone built
  successfully in 5m 38s. Its APK SHA differs from the local-tree build, so no
  bit-for-bit reproducibility claim is made.

## References

- [F-Droid build metadata](https://fdroid.gitlab.io/jekyll-fdroid/docs/Build_Metadata_Reference/)
- [F-Droid inclusion policy](https://fdroid.gitlab.io/jekyll-fdroid/en/docs/Inclusion_Policy/)
- [Building applications](https://fdroid.gitlab.io/jekyll-fdroid/docs/Building_Applications/)
