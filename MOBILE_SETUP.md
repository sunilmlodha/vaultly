# Vaultly Mobile App Setup

## Architecture
The mobile apps use **Capacitor** as a native shell that loads the live Vercel deployment.
This means:
- No separate mobile backend needed
- App updates deploy automatically (no App Store release required for content changes)
- Push notifications, haptics, and native features via Capacitor plugins

---

## Prerequisites

### iOS
- Mac with Xcode 15+ installed
- Apple Developer Account ($99/year) → https://developer.apple.com/
- iPhone or iPad for testing (or Simulator)

### Android
- Android Studio installed → https://developer.android.com/studio
- Java 17+
- Android device or emulator for testing

---

## Step 1: Generate App Icons

Run once after setting up the `assets/icon.svg`:

```bash
npm install @capacitor/assets --save-dev
npx @capacitor/assets generate --iconBackgroundColor '#6366f1' --iconBackgroundColorDark '#6366f1' --splashBackgroundColor '#6366f1'
```

This generates all required icon sizes for iOS and Android automatically.

---

## Step 2: Build and Sync

Since we use a remote server URL, you don't need a full Next.js build for the shell.
Just sync Capacitor:

```bash
npx cap sync
```

---

## Step 3: iOS Setup

### Open in Xcode
```bash
npx cap open ios
```

### In Xcode:
1. Select your team in **Signing & Capabilities**
2. Change Bundle ID if needed (currently `app.vaultly.finance`)
3. Add **Push Notifications** capability → Signing & Capabilities → + Capability → Push Notifications
4. Add **Background Modes** → check "Remote notifications"

### Configure APNs (push notifications):
1. Go to Apple Developer → Certificates, Identifiers & Profiles
2. Create an **APNs key** (Auth Key)
3. Download the `.p8` file
4. Add to your Vercel env vars:
   - `APNS_KEY_ID` = Key ID from Apple
   - `APNS_TEAM_ID` = Your Apple Team ID  
   - `APNS_KEY` = Contents of the .p8 file

### Run on simulator:
```bash
npx cap run ios
```

### Submit to App Store:
1. Product → Archive in Xcode
2. Distribute App → App Store Connect
3. Fill in App Store Connect listing:
   - App name: Vaultly - Family Wealth Tracker
   - Category: Finance
   - Age Rating: 4+
   - Privacy Policy URL: https://vaultly-mu.vercel.app/privacy
   - Screenshots required: 6.7", 6.1", iPad 12.9"

---

## Step 4: Android Setup

### Open in Android Studio
```bash
npx cap open android
```

### In Android Studio:
1. File → Project Structure → confirm App ID is `app.vaultly.finance`
2. Build → Generate Signed Bundle/APK

### Configure FCM (push notifications):
1. Go to **Firebase Console** → https://console.firebase.google.com
2. Create project "Vaultly"
3. Add Android app with package `app.vaultly.finance`
4. Download `google-services.json`
5. Place in `android/app/google-services.json`
6. Copy the **Server Key** to Vercel env var `FCM_SERVER_KEY`

### Run on emulator:
```bash
npx cap run android
```

### Submit to Google Play:
1. Build → Generate Signed Bundle → Android App Bundle (.aab)
2. Go to **Play Console** → https://play.google.com/console
3. Create app → Internal testing → Upload .aab
4. Fill in store listing:
   - App name: Vaultly - Family Wealth Tracker
   - Category: Finance
   - Screenshots required: phone, 7" tablet, 10" tablet

---

## App Store Checklist

### Both stores
- [ ] App icon generated (all sizes)
- [ ] Splash screen configured
- [ ] Privacy Policy published at vaultly-mu.vercel.app/privacy
- [ ] Terms of Service published
- [ ] App screenshots (5 minimum)
- [ ] App description written
- [ ] Keywords chosen
- [ ] Age rating confirmed (4+)

### iOS only
- [ ] Apple Developer account active ($99/year)
- [ ] Bundle ID registered: app.vaultly.finance
- [ ] APNs key created and configured
- [ ] Push notification entitlements added in Xcode
- [ ] TestFlight beta testing completed

### Android only
- [ ] google-services.json added to android/app/
- [ ] Signing keystore created and backed up safely
- [ ] FCM server key in Vercel env vars
- [ ] Play Store listing complete

---

## Environment Variables (add to Vercel)

```
# iOS Push Notifications (APNs)
APNS_KEY_ID=your_key_id
APNS_TEAM_ID=your_team_id
APNS_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# Android Push Notifications (FCM)
FCM_SERVER_KEY=your_fcm_server_key

# App URLs
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/vaultly/idXXXXXXXXX
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=app.vaultly.finance
```

---

## Quick commands reference

```bash
# Sync after any changes
npx cap sync

# Open iOS in Xcode
npx cap open ios

# Open Android in Android Studio
npx cap open android

# Run on connected iOS device
npx cap run ios --target YOUR_DEVICE_ID

# Run on Android emulator
npx cap run android

# Generate icons from assets/icon.svg
npx @capacitor/assets generate
```
