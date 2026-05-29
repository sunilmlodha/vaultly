# Vaultly Mobile App

Vaultly uses [Capacitor](https://capacitorjs.com/) to package the Next.js web app as a native iOS and Android app.

The app loads `https://vaultly-mu.vercel.app` in a native WebView — meaning updates ship automatically without App Store review. Native capabilities (biometrics, push notifications, splash screen) are added via Capacitor plugins.

---

## Prerequisites

| Requirement | iOS | Android |
|---|---|---|
| macOS | Required | Optional (Linux/Windows ok) |
| Xcode 15+ | Required | Not needed |
| iOS 16+ device or simulator | Required | — |
| Android Studio Flamingo+ | Optional | Required |
| Java 17+ | — | Required |
| CocoaPods | Required | — |

Install CocoaPods: `sudo gem install cocoapods`

---

## First-time setup

```bash
# 1. Install dependencies (already done if you ran npm install)
npm install

# 2. Add iOS and Android platforms
npm run mobile:add:ios
npm run mobile:add:android

# 3. Sync web assets to native projects
npm run mobile:sync
```

---

## Daily development

```bash
# Sync latest changes
npm run mobile:sync

# Open in Xcode (iOS)
npm run mobile:open:ios

# Open in Android Studio
npm run mobile:open:android
```

---

## App icons & splash screens

Use [capacitor-assets](https://github.com/ionic-team/capacitor-assets) to auto-generate all required sizes:

```bash
npm install -g @capacitor/assets

# Place your source files:
# resources/icon.png        — 1024×1024 app icon (no transparency)
# resources/splash.png      — 2732×2732 splash screen
# resources/splash-dark.png — 2732×2732 dark mode splash (optional)

npx capacitor-assets generate
```

---

## App Store submission (iOS)

1. Open Xcode: `npm run mobile:open:ios`
2. Set your **Team** in Signing & Capabilities
3. Set **Bundle Identifier**: `app.vaultly.finance`
4. Set **Deployment Target**: iOS 16.0
5. Add the following capabilities:
   - Push Notifications
   - Sign in with Apple (optional)
   - Face ID (add NSFaceIDUsageDescription to Info.plist)
6. Archive: Product → Archive
7. Upload via Xcode Organizer or Transporter

**Info.plist additions required:**
```xml
<key>NSFaceIDUsageDescription</key>
<string>Vaultly uses Face ID to keep your financial data secure.</string>
<key>NSCameraUsageDescription</key>
<string>Used to scan documents.</string>
```

---

## Google Play submission (Android)

1. Open Android Studio: `npm run mobile:open:android`
2. Set `applicationId` to `app.vaultly.finance` in `app/build.gradle`
3. Set `minSdkVersion 24`, `targetSdkVersion 35`
4. Generate a signed APK/AAB: Build → Generate Signed Bundle/APK
5. Upload AAB to Google Play Console

**AndroidManifest.xml additions required:**
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## Push notifications (renewal reminders)

```typescript
import { PushNotifications } from '@capacitor/push-notifications'

// Request permission
await PushNotifications.requestPermissions()
await PushNotifications.register()

// Get device token (send to your server)
PushNotifications.addListener('registration', (token) => {
  console.log('Push token:', token.value)
  // POST /api/push-tokens  { token: token.value }
})
```

---

## App Store metadata checklist

- [ ] App name: Vaultly
- [ ] Subtitle: Family Wealth & Renewal Manager
- [ ] Keywords: finance, budget, net worth, pension, wealth, renewal, bills
- [ ] Support URL: https://vaultly-mu.vercel.app/support
- [ ] Privacy Policy URL: https://vaultly-mu.vercel.app/privacy
- [ ] Age rating: 17+ (Financial)
- [ ] Primary category: Finance
- [ ] Screenshots: 6.7" iPhone 15 Pro Max (required), 6.1" iPhone 14, iPad 12.9"
- [ ] App Preview video: 30 seconds (optional but strongly recommended)
- [ ] What's new text (first submission): "Initial release"
