# Mobile app — store readiness checklist

KuTaGjej is a Next.js website. The store apps are a **Capacitor hybrid shell** in `/mobile` that loads `https://kutagjej.al`.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 1. Mobile web polish | Ongoing | Site already responsive |
| 2. Capacitor shell + Android | **Done** | `/mobile` + `android/` |
| 3. Native bridges in website | **Done** | Camera, share, back button, splash/status, push register stub |
| 4. Account deletion (store rule) | **Done** | Profili → “Fshi llogarinë”. Deletes owned Supabase/Vercel Blob files first; Auth user is removed only if that cleanup succeeds |
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

## Apple IAP (RevenueCat)

Native iOS sells packages / coins / Premium / Okazion via StoreKit + RevenueCat. Prices on those buttons come from `Purchases.getProducts` → `priceString` (the store’s localized price). If the RevenueCat key or a product is missing, the iOS button stays disabled and does not open POK checkout. The website keeps POK checkout.

Auto-Refresh card checkout is not offered in the current package UI (`Auto-Refresh nuk ofrohet më` on the checkout page). Product ids `al.kutagjej.autorefresh.10` and `.20` remain in `backend/lib/revenuecat-products.js` for a future catalog; they have no purchase button today.

### Env

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` | Vercel / `.env.local` | Public Apple SDK key |
| `REVENUECAT_WEBHOOK_SECRET` | Backend / Vercel API | Authorization header for webhooks |

### RevenueCat webhook

- URL: `https://www.kutagjej.al/api/webhooks/revenuecat`
- Authorization: same string as `REVENUECAT_WEBHOOK_SECRET`
- App User ID in the app = Supabase profile UUID (`ensureRevenueCat(userId)`)

### Product IDs (must match ASC + `backend/lib/revenuecat-products.js`)

- Plans: `al.kutagjej.plan.{starter\|grow\|elite}.1m`
- Coins: `al.kutagjej.coins.{starter\|growth\|pro}`
- Premium: `al.kutagjej.premium.{15\|30}`
- Okazion: `al.kutagjej.okazion.5`

### After code changes

```bash
cd mobile && npx cap sync ios
```

In Xcode → App target → **Signing & Capabilities** → ensure **In-App Purchase** is present.

### DB

Apply migration `iap_processed_events` (idempotency for webhook grants). Never re-run `init.sql` on production.

Apply `supabase/migrations/20260927120000_content_reports_user_blocks.sql` yourself if it is not already on the live project. It adds `content_reports` and `user_blocks` (Guideline 1.2). Do not run it from an agent session against production, and do not re-run `init.sql`.

## What the iOS app already does (no extra “native” screens)

These flows are the website inside the Capacitor shell, plus the native bridges already wired:

- Marketplace: browse and post listings (real estate, cars, jobs, marketplace, businesses, professionals)
- Messaging: `/user/dashboard` messages, including listing inquiries
- Reporting and blocking: message and profile menus (“Raporto”, “Blloko”) write `content_reports` / `user_blocks` once that migration is applied
- Camera / photo library: listing image picker and ID verification use the Capacitor camera plugin, with the file input as fallback
- IAP: package, coin, Premium, and Okazion purchases on iOS go through StoreKit when RevenueCat is configured

Apple’s review decision is discretionary. Nothing here means approval is guaranteed.

## Still manual before App Store review

Confirm these in App Store Connect, RevenueCat, and on a device. The repo cannot complete them:

1. **Privacy labels** — match App Store Connect nutrition labels to `src/app/privatesia/page.tsx` (updated 18 October 2026). Confirm the owner agrees the named processors are the ones in production: Supabase, Vercel (hosting and Blob when `BLOB_READ_WRITE_TOKEN` is set), POK Payments (website only), Apple IAP, RevenueCat, OpenAI (AI import, AI search, ID scan), and APNs after the user allows notifications. Do not add a retention period that the product does not state.
2. **Privacy policy URL** — the live page must be the updated policy before review.
3. **Product configuration** — create the product ids in App Store Connect and RevenueCat (see the list above), including Albania/storefront pricing. The app no longer shows hard-coded USD amounts. A missing product shows “I padisponueshëm” and cannot be bought. Confirm whether Auto-Refresh products should stay unwired.
4. **Reviewer access** — put a demo publishing account (email + password) in App Review Information. Reviewers need it to post a listing, open messages, report/block, and attempt a Sandbox purchase. Do not put the password in this repo.
5. **APNs** — push is not requested at launch. The user turns it on under notification settings. Delivery still needs the Apple push key / capability and a device token path that reaches the API. Until that is configured, the settings screen reports that push is not configured; the rest of the app keeps working.
6. **Signing** — Xcode → App target → Signing & Capabilities → Team, plus In-App Purchase. `source mobile/scripts/ios-env.sh` if CocoaPods is not on PATH.
7. **On device / TestFlight** — install a Release or TestFlight build, confirm kutagjej.al loads, camera prompt appears only when picking a photo, notification permission appears only from notification settings, a Sandbox purchase shows the App Store price, and account deletion is reachable from the profile. Do not test deletion against a real customer account.
8. **Deep links** — replace TEAMID / SHA256 in `.well-known` after the release signing identity exists.
9. **Deploy** — ship the website (account-deletion storage cleanup, privacy page, IAP fail-closed, push prompt) before the binary that loads `https://kutagjej.al` is reviewed.
