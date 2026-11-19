# F-Droid build readiness

## Source build path

The Android project uses Capacitor. `npx cap sync android` copies the built
web runtime and plugin metadata into `android/app/src/main/assets` and creates
the `android/capacitor-cordova-android-plugins` Gradle project. Those files are
now tracked so the Android wrapper can be built from the public Git source
without running npm or fetching packages during the F-Droid Gradle build.
Application TypeScript/React source remains in `src/`; regenerate and review
the synchronized assets with `npm run build && npx cap sync android` for each
release.

The root `.fdroid.yml` describes version `0.1.0` (`versionCode: 1`) and uses
`android/` with Gradle's release task. Its build commit is the full source SHA
`5951f71115b422d38aea94c72387f597207fd66d`. The unsigned release APK was built offline with `assembleRelease`;
the APK includes the app ID, SDK 24 minimum, target SDK 35, and the synchronized
web runtime. This verifies a local offline source build, not a clean F-Droid
build-server run.

## Current release state

- Package ID: `org.privatedao.wallet`.
- Minimum SDK 24, target SDK 35, compile SDK 36.
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

## References

- [F-Droid build metadata](https://fdroid.gitlab.io/jekyll-fdroid/docs/Build_Metadata_Reference/)
- [F-Droid inclusion policy](https://fdroid.gitlab.io/jekyll-fdroid/en/docs/Inclusion_Policy/)
- [Building applications](https://fdroid.gitlab.io/jekyll-fdroid/docs/Building_Applications/)
