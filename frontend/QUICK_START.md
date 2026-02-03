# IAP Quick Start - 5 Steps to Go Live

## 🚀 Critical Path (Do This First)

### Step 1: Get Google Play Billing Key (5 minutes)
1. Open: [Google Play Console](https://play.google.com/console)
2. Navigate: Your App → **Setup** → **Licensing**
3. Copy: **"Base64-encoded RSA public key"** (long string starting with `MII...`)
4. Edit: `frontend/android/app/src/main/res/values/strings.xml`
5. Replace:
   ```xml
   <string name="billing_key">YOUR_ACTUAL_BASE64_KEY_HERE</string>
   ```

---

### Step 2: Create In-App Product (10 minutes)
1. Navigate: Play Console → **Monetization setup** → **Products** → **In-app products**
2. Click: **"Create product"**
3. Fill in:
   ```
   Product ID: wedding_video_download
   Name: Wedding Video Download
   Description: Unlock download for one personalized wedding video
   Type: Consumable ✓
   Price: ₹10 INR
   Status: Active
   ```
4. Click: **Save**
5. ⚠️ **IMPORTANT**: Wait **2-4 hours** for product to activate

---

### Step 3: Build APK (2 minutes)
```bash
cd frontend
npm run build:apk
```

This will:
- Build with `VITE_MONETIZATION_ENABLED=true`
- Sync Capacitor plugins
- Output: `android/app/build/outputs/apk/`

---

### Step 4: Sign & Upload to Internal Testing (15 minutes)
1. Open: `frontend/android` in Android Studio
2. **Build** → **Generate Signed Bundle/APK**
3. Select: **APK**
4. Create/use signing key
5. Build release APK
6. Navigate: Play Console → **Testing** → **Internal testing**
7. Click: **Create new release**
8. Upload: Signed APK
9. Add release notes: "Added in-app purchase for video downloads"
10. Save and publish

---

### Step 5: Test Purchase Flow (10 minutes)

#### Add Test Account
1. Play Console → **Internal testing** → **Testers**
2. Add your Gmail account to testers list
3. Click **Save**

#### Install from Play Store
1. Open test link (from Internal testing page)
2. Install app on Android device
3. **DO NOT** sideload APK (won't work for IAP testing)

#### Test Cases
```
1. ✅ Generate video with normal venue → See "Buy & Download (₹10)"
2. ✅ Click button → Google Play dialog appears
3. ✅ Complete test purchase → Video downloads automatically
4. ✅ Generate video with venue "Hotel Jain Ji Shubham" → See normal "Download"
```

#### Verify Purchase
1. Play Console → **Order management**
2. Search for your test email
3. See purchase: `wedding_video_download` - Completed

---

## ⚡ Quick Commands

```bash
# Build APK
npm run build:apk

# Disable IAP (emergency)
# Edit .env.production: VITE_MONETIZATION_ENABLED=false
# Then rebuild

# Clean build
npx cap sync android
```

---

## 🔥 Common Issues

| Issue | Fix |
|-------|-----|
| "Product not found" | Wait 2-4 hours after creating product |
| Test purchase fails | Must install from Play Store link (not sideload) |
| IAP not working | Check `strings.xml` has billing key |
| Button shows on web | Expected - platform detection auto-disables IAP on web |

---

## 📞 Support Files

- **Full Setup**: `IAP_SETUP.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Code Location**: `src/utils/iapManager.js`

---

## ✅ Checklist

- [ ] Step 1: Add billing key to `strings.xml`
- [ ] Step 2: Create product in Play Console (wait 2-4h)
- [ ] Step 3: Build APK with `npm run build:apk`
- [ ] Step 4: Upload to Internal Testing
- [ ] Step 5: Test purchase with test account

**After testing**: Promote to Production track 🎉

---

**Note**: Web version requires no changes - it stays completely free automatically.
