# Mobile app — store readiness checklist

KuTaGjej is a Next.js website. The store apps are a **Capacitor hybrid shell** in `/mobile` that loads `https://kutagjej.al`.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 1. Mobile web polish | Ongoing | Site already responsive |
| 2. Capacitor shell + Android | **Done** | `/mobile` + `android/` |
| 3. Native bridges in website | **Done** | Camera, share, back button, splash/status, push register stub |
| 4. Account deletion (store rule) | **Done** | Profili → “Fshi llogarinë” + `POST /api/account/delete` |
| 5. App icons (Android PNGs) | **Done (placeholder)** | From `Ku-Ta-Gjej-Logo.png` — refine in Android Studio later |
| 6. First local Android build | **Your turn** | Needs Android Studio + JDK 21 |
| 7. iOS platform | **Done** | `/mobile/ios` + camera/photo/push Info.plist keys |
| 8. Firebase / FCM + APNs | Manual | Push won’t deliver until configured |
| 9. Deep link certs | Manual | Replace TEAMID / SHA256 in `.well-known` |
| 10. Store listing + review | Manual | Accounts, screenshots, payments policy |

## What engineering already did

- Capacitor app id `al.kutagjej.app`
- Offline fallback page
- Android App Links intent filters
- Website Capacitor boot (`NativeAppBoot`)
- Native camera on listing image picker (falls back to file input on web)
- Native share for listing share metrics
- Push plugin installed (registration only; needs Firebase)
- Privacy / well-known stubs
- Self-serve account deletion for App Store compliance
- iOS Xcode project with usage descriptions (camera / photos / push background mode)

## Open iOS in Xcode

```bash
cd mobile
source scripts/ios-env.sh   # CocoaPods on PATH (user gem install)
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → choose your Team
2. Pick a simulator or device → Run (▶)
3. Confirm `https://kutagjej.al` loads in the WebView

If `pod` is missing after a reboot, run `source scripts/ios-env.sh` again (adds `~/.gem/ruby/2.6.0/bin` to PATH). Prefer installing **Homebrew + `brew install cocoapods`** when you have admin rights.

## What you must do manually (next)

1. Install **Android Studio** + **JDK 21** (for Play Store builds)
2. ```bash
   cd mobile && npm install && npx cap sync && npx cap open android
   ```
3. Run Android on emulator/device and confirm kutagjej.al loads
4. Create **Google Play Console** + **Apple Developer** accounts
5. Create **Firebase** project, add Android/iOS apps, download `google-services.json` / `GoogleService-Info.plist`
6. After signing a release build, put the **SHA-256** into `public/.well-known/assetlinks.json`
7. Put Apple **Team ID** into `public/.well-known/apple-app-site-association` (`TEAMID.al.kutagjej.app`)
8. Store screenshots, descriptions, age rating, Data safety / Privacy labels
9. Decide **web-only payments** vs Apple **IAP** before iOS submission
10. Deploy website changes (account deletion + `.well-known` + Capacitor JS) to production before store review

## Payments warning

Selling credits inside the iOS app often requires Apple IAP. Prefer web checkout until that is decided.
