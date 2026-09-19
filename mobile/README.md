# KuTaGjej mobile (Capacitor)

Hybrid shell for **App Store** and **Play Store**. Loads `https://kutagjej.al`.

## Quick start (iOS — Xcode)

```bash
cd mobile
source scripts/ios-env.sh    # if `pod` is not on PATH
npm install
npx cap sync ios
npx cap open ios
```

In Xcode: pick your **Team** under Signing & Capabilities, then Run on a simulator/device.

Needs: **Xcode** (+ CocoaPods; already usable via user gem — see `scripts/ios-env.sh`).

## Quick start (Android)

```bash
cd mobile
npm install
npx cap sync
npx cap open android
```

Needs: **Android Studio + JDK 21**.

## Identity

- App ID: `al.kutagjej.app`
- Name: `KuTaGjej`
- URL: `https://kutagjej.al`

## Full checklist

See [`../docs/mobile-app.md`](../docs/mobile-app.md).
