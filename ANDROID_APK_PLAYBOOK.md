# Android APK Build Playbook - Nevika Cura

## Why You're Getting Old APK

The issue is likely one of these:
1. **Cached Build** - Android Studio caches previous builds
2. **Wrong Project** - Opening old project instead of new clone
3. **Gradle Cache** - Gradle keeps old compiled resources
4. **APK not rebuilt** - Changes not triggering rebuild

---

## COMPLETE FRESH BUILD STEPS

### Step 1: Delete ALL Old Files (IMPORTANT!)

```bash
# On your computer, delete these folders completely:

# Windows:
rmdir /s /q "%USERPROFILE%\.gradle\caches"
rmdir /s /q "%USERPROFILE%\.android\build-cache"
rmdir /s /q "C:\path\to\your\old\project"

# Mac/Linux:
rm -rf ~/.gradle/caches
rm -rf ~/.android/build-cache
rm -rf /path/to/your/old/project
```

### Step 2: Clone Fresh from GitHub

```bash
# Clone your NEW repository (not the old one)
git clone https://github.com/YOUR_USERNAME/YOUR_NEW_REPO.git nevika-cura-fresh

# Navigate to the project
cd nevika-cura-fresh
```

### Step 3: Create New Android Project in Android Studio

**DO NOT** open an existing project. Create a NEW TWA project:

1. Open Android Studio
2. Click **File → New → New Project**
3. Select **"No Activity"** (Empty project)
4. Configure:
   - Name: `NevikaCura`
   - Package name: `com.nevikacura.app`
   - Save location: Choose a NEW folder
   - Language: Kotlin
   - Minimum SDK: API 24

### Step 4: Add TWA (Trusted Web Activity) Dependencies

Edit `app/build.gradle`:

```gradle
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.nevikacura.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.nevikacura.app"
        minSdk 24
        targetSdk 34
        versionCode 2  // INCREMENT THIS for new version
        versionName "2.0.0"  // UPDATE THIS

        // TWA Configuration
        manifestPlaceholders = [
            hostName: "orange-health-ui.preview.emergentagent.com",
            defaultUrl: "https://orange-health-ui.preview.emergentagent.com",
            launcherName: "Nevika Cura",
            assetStatements: '[{ "relation": ["delegate_permission/common.handle_all_urls"], "target": { "namespace": "web", "site": "https://orange-health-ui.preview.emergentagent.com" } }]'
        ]
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}
```

### Step 5: Update AndroidManifest.xml

Replace contents of `app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Nevika Cura"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.NevikaCura"
        tools:targetApi="31">

        <meta-data
            android:name="asset_statements"
            android:value="${assetStatements}" />

        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true"
            android:theme="@style/Theme.NevikaCura.Starting">

            <meta-data
                android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="${defaultUrl}" />

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${hostName}" />
            </intent-filter>
        </activity>

        <service
            android:name="com.google.androidbrowserhelper.trusted.DelegationService"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.support.customtabs.trusted.TRUSTED_WEB_ACTIVITY_SERVICE" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </service>

    </application>
</manifest>
```

### Step 6: Add App Icon

1. Download your new icon from:
   `https://customer-assets.emergentagent.com/job_orange-health-ui/artifacts/fq6yxx1d_file_00000000bc4071fab2fff5b70300c016.png`

2. In Android Studio:
   - Right-click on `app/src/main/res`
   - Select **New → Image Asset**
   - Choose **Launcher Icons (Adaptive and Legacy)**
   - Source Asset: Select your downloaded icon
   - Click **Next → Finish**

### Step 7: Create Splash Theme

Create `app/src/main/res/values/themes.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.NevikaCura" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="android:statusBarColor">#14B8A6</item>
        <item name="android:navigationBarColor">#FFFFFF</item>
    </style>

    <style name="Theme.NevikaCura.Starting" parent="Theme.NevikaCura">
        <item name="android:windowBackground">#FFFFFF</item>
    </style>
</resources>
```

### Step 8: Clean and Rebuild (CRITICAL!)

In Android Studio:

1. **Build → Clean Project** (Wait for completion)
2. **Build → Rebuild Project** (Wait for completion)
3. **File → Invalidate Caches → Invalidate and Restart**
4. After restart: **Build → Rebuild Project** again

### Step 9: Generate Signed APK

1. **Build → Generate Signed Bundle / APK**
2. Select **APK** → Next
3. Create NEW keystore (or use existing):
   - Key store path: Create new `.jks` file
   - Password: Choose secure password
   - Key alias: `nevikacura`
   - Key password: Choose secure password
   - Validity: 25 years
   - Fill certificate info
4. Select **release** build variant
5. Click **Create**

### Step 10: Find Your APK

APK location:
```
app/release/app-release.apk
```

---

## TROUBLESHOOTING: Still Getting Old APK?

### Nuclear Option - Complete Reset

```bash
# 1. Close Android Studio completely

# 2. Delete ALL Android Studio caches (Windows)
rmdir /s /q "%USERPROFILE%\.gradle"
rmdir /s /q "%USERPROFILE%\.android"
rmdir /s /q "%LOCALAPPDATA%\Google\AndroidStudio*"

# 3. Delete ALL Android Studio caches (Mac)
rm -rf ~/.gradle
rm -rf ~/.android
rm -rf ~/Library/Application\ Support/Google/AndroidStudio*
rm -rf ~/Library/Caches/Google/AndroidStudio*

# 4. Delete project folder completely
rm -rf /path/to/project

# 5. Restart computer

# 6. Open Android Studio fresh - it will redownload everything

# 7. Create brand new project following steps above
```

### Verify APK Contents

After building, verify your APK has the new URL:

```bash
# Extract and check the APK
unzip -p app-release.apk AndroidManifest.xml | strings | grep "orange-health"
```

---

## Quick Reference - Version Codes

Each time you build a new APK, increment these in `build.gradle`:

```gradle
versionCode 3  // Increment by 1 each build
versionName "2.0.1"  // Update version string
```

---

## App URLs

- **Production URL**: `https://orange-health-ui.preview.emergentagent.com`
- **New App Icon**: `https://customer-assets.emergentagent.com/job_orange-health-ui/artifacts/fq6yxx1d_file_00000000bc4071fab2fff5b70300c016.png`

---

## Contact

If you still face issues after following all steps, the problem might be:
1. Chrome browser cache on device - Clear Chrome data
2. Old APK still installed - Uninstall completely before installing new
3. Device caching - Restart device after uninstalling old app

