# Nevika Cura - Android APK Build Guide

## Prerequisites
1. **Android Studio** - Download from: https://developer.android.com/studio
2. **Java JDK 17+** (Android Studio usually includes this)

---

## Step-by-Step Build Instructions

### Step 1: Open Project in Android Studio
1. Open Android Studio
2. Click **"Open"** (not "New Project")
3. Navigate to: `frontend/android` folder
4. Click **OK** and wait for Gradle sync to complete (may take 2-5 minutes first time)

### Step 2: Wait for Gradle Sync
- You'll see "Gradle sync" progress at the bottom
- Wait until it says **"Gradle sync finished"**
- If there are errors, click **"Sync Now"** in the yellow bar at top

### Step 3: Build the APK
1. Go to menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete (1-3 minutes)
3. When done, click **"locate"** in the notification popup
4. The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Install on Phone
- Transfer `app-debug.apk` to your phone
- Open it and tap **"Install"**
- You may need to enable "Install from unknown sources"

---

## Build Signed APK (For Play Store)

### Generate Signing Key (One-time)
```bash
keytool -genkey -v -keystore nevika-cura-release.keystore -alias nevika-cura -keyalg RSA -keysize 2048 -validity 10000
```

### Create Signed APK
1. Go to: **Build → Generate Signed Bundle / APK**
2. Select **APK** → Next
3. Choose your keystore file
4. Enter passwords
5. Select **release** build variant
6. Click **Finish**

---

## Troubleshooting

### "SDK location not found"
1. Go to **File → Project Structure → SDK Location**
2. Set Android SDK path (usually `C:\Users\YourName\AppData\Local\Android\Sdk` on Windows)

### Build fails with "minSdk" error
1. Open `android/app/build.gradle`
2. Find `minSdkVersion` and change to `22`

### Camera not working
- The app already has camera permission in AndroidManifest.xml
- User will be prompted to allow camera when first accessing face attendance

---

## App Details
- **Package Name:** `com.nevikacura.app`
- **App Name:** Nevika Cura
- **Min Android Version:** 5.1 (API 22)
- **Target Android Version:** 13 (API 33)

---

## Updating the App

When you make changes to the web app:

1. Deploy changes to the website
2. The Capacitor app will automatically load the new version from the URL

OR for offline-first updates:

```bash
cd frontend
yarn build
npx cap sync android
```
Then rebuild the APK in Android Studio.

---

## Questions?
The app is configured to load from: `https://faithcare-review-hub.preview.emergentagent.com`

This means you just need to build the APK once, and all future updates to your website will automatically appear in the app!
