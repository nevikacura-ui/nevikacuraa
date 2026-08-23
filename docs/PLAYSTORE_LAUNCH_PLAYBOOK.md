# Play Store Launch Playbook for Nevika Cura

## Quick Answer: Push Notifications on Your Phone

### Current State (PWA - What You Have Now)
Your app already supports **Web Push Notifications** which work:
- ✅ **Chrome/Edge on Android** - Rich notifications in notification panel
- ✅ **Desktop browsers** - Chrome, Edge, Firefox
- ❌ **iOS Safari** - Limited support (iOS 16.4+ only, must add to home screen)

**To test NOW:**
1. Open the Staff Portal in Chrome on your Android phone
2. Login → Browser will ask "Allow notifications?"
3. Tap "Allow"
4. When new appointments come in → You'll see notifications in your phone's notification panel!

### Native App (Play Store) - Better Experience
For **guaranteed rich notifications** with:
- Custom sounds
- Notification badges on app icon
- Background sync
- Full offline support

You need to publish to Play Store.

---

## Play Store Launch Playbook

### Phase 1: Prepare Your PWA for TWA (Trusted Web Activity)

TWA wraps your existing web app as an Android app - **no code rewrite needed!**

#### Step 1: Create Digital Asset Links (5 mins)
Create file: `frontend/public/.well-known/assetlinks.json`
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.nevikacura.app",
    "sha256_cert_fingerprints": ["YOUR_SIGNING_KEY_FINGERPRINT"]
  }
}]
```

#### Step 2: Generate Android App using Bubblewrap (15 mins)
```bash
# Install Bubblewrap CLI
npm install -g @anthropic/anthropicpwa/cli

# Or use PWABuilder (easier)
# Go to: https://www.pwabuilder.com
# Enter your app URL
# Click "Package for stores" → Android
# Download the generated APK/AAB
```

#### Step 3: Sign Your App
```bash
# Generate signing key (keep this SAFE!)
keytool -genkey -v -keystore nevika-cura.keystore -alias nevikacura -keyalg RSA -keysize 2048 -validity 10000

# Get SHA256 fingerprint for assetlinks.json
keytool -list -v -keystore nevika-cura.keystore -alias nevikacura
```

### Phase 2: Google Play Console Setup

#### Step 1: Create Developer Account
1. Go to: https://play.google.com/console
2. Pay one-time $25 registration fee
3. Complete identity verification (takes 2-7 days)

#### Step 2: Create App Listing
Required assets:
- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG
- **Screenshots**: 
  - Phone: 2-8 screenshots (16:9 or 9:16)
  - Tablet: 2-8 screenshots (optional but recommended)
- **Short Description**: Max 80 characters
- **Full Description**: Max 4000 characters

#### Step 3: Upload AAB (Android App Bundle)
1. Go to Production → Create new release
2. Upload your `.aab` file (not APK)
3. Add release notes

#### Step 4: Complete Store Listing
- Content rating questionnaire
- Target audience (All ages / 13+ / etc.)
- Data safety form (declare what data you collect)
- App category: Medical

#### Step 5: Submit for Review
- Initial review takes 1-7 days
- May require additional documentation for medical apps

---

## Alternative: Capacitor (More Native Features)

If you want deeper native integration:

```bash
# In frontend directory
npm install @capacitor/core @capacitor/cli
npx cap init "Nevika Cura" com.nevikacura.app

# Add Android platform
npm install @capacitor/android
npx cap add android

# Add push notifications plugin
npm install @capacitor/push-notifications

# Build and sync
npm run build
npx cap sync

# Open in Android Studio
npx cap open android
```

Then build APK/AAB from Android Studio.

---

## Timeline Summary

| Task | Time |
|------|------|
| PWABuilder TWA generation | 30 mins |
| Developer account setup | 2-7 days (verification) |
| Store listing creation | 2-3 hours |
| Review process | 1-7 days |
| **Total** | **~2 weeks** |

---

## Important Notes

1. **Medical App Requirements**: Google may ask for documentation proving you're a legitimate healthcare provider
2. **Keep Signing Key Safe**: Losing it means you can't update your app
3. **Test Internal First**: Use Internal Testing track before Production
4. **Privacy Policy Required**: Must have a privacy policy URL

---

## Quick Commands Reference

```bash
# Generate TWA using PWABuilder
# 1. Visit https://www.pwabuilder.com
# 2. Enter: https://your-app-url.emergentagent.com
# 3. Download Android package

# Or use Bubblewrap CLI
npx @anthropic/anthropicpwa/cli init --manifest https://your-app-url/manifest.json
npx @anthropic/anthropicpwa/cli build
```

Your app is already PWA-ready with service workers and web push - the Play Store version will just be a thin wrapper around it!
