# Google Play In-App Purchase Setup Guide

## Quick Start

This app implements **consumable IAP** for Android video downloads. Web version stays completely free.

### 🔑 Key Files
- `src/utils/iapManager.js` - IAP logic (initialization, purchase flow, product info)
- `src/components/ResultScreen.jsx` - UI with Buy & Download button
- `src/App.jsx` - IAP initialization on startup
- `.env.production` - Configuration (product SKU, price display, enable/disable)
- `android/app/src/main/res/values/strings.xml` - Google Play billing key

---

## Initial Setup

### 1. Install Dependencies (Already Done)
```bash
cd frontend
npm install cordova-plugin-purchase@13.13.0
npx cap sync android
```

### 2. Configure Google Play Console

#### Create In-App Product
1. Go to: [Google Play Console](https://play.google.com/console) → Your App → Monetization setup → Products → In-app products
2. Click **"Create product"**
3. Fill in:
   - **Product ID**: `wedding_video_download` (must match `VITE_IAP_PRODUCT_SKU`)
   - **Name**: "Wedding Video Download"
   - **Description**: "Unlock download for one personalized wedding video"
   - **Type**: **Consumable** ✓
   - **Price**: ₹10 INR (or your desired price)
   - **Status**: Active
4. Click **Save**
5. ⚠️ **Wait 2-4 hours** for product to become active

#### Get Billing License Key
1. Go to: Google Play Console → Setup → Licensing
2. Copy **"Base64-encoded RSA public key"** (long string starting with `MII...`)
3. Open: `frontend/android/app/src/main/res/values/strings.xml`
4. Replace placeholder:
   ```xml
   <string name="billing_key">YOUR_ACTUAL_BASE64_KEY_HERE</string>
   ```

---

## Configuration

### Environment Variables (.env.production)

```bash
# Backend API
VITE_API_URL=https://wedding-invite-fly.fly.dev

# IAP Settings
VITE_MONETIZATION_ENABLED=true                    # Set to false to disable IAP globally
VITE_IAP_PRODUCT_SKU=wedding_video_download       # Must match Google Play product ID
VITE_IAP_PRICE_DISPLAY=₹10                        # Fallback price for button (real price from Play Store)
```

**Emergency Kill Switch**: Set `VITE_MONETIZATION_ENABLED=false` to disable IAP immediately.

---

## Building & Testing

### Build APK with IAP
```bash
cd frontend
npm run build:apk
```

This runs:
1. Vite build with production env vars
2. `cap sync android` to copy assets + sync plugins
3. Open in Android Studio → Build → Generate Signed APK

**Output**: `android/app/build/outputs/apk/release/app-release.apk`

### Testing Workflow

#### Phase 1: Dev Mode Bypass (Quick Test)
1. Build APK with `VITE_MONETIZATION_ENABLED=true`
2. Install on device
3. Generate video with venue: **"Hotel Jain Ji Shubham"**
4. ✅ **Expected**: Normal Download/Share buttons (NOT "Buy & Download")
5. Verify download works

**Pass Criteria**: Dev mode bypasses IAP ✓

---

#### Phase 2: Web Version (No Regression)
1. Deploy web build to production
2. Open in web browser
3. Generate video
4. ✅ **Expected**: Normal Download/Share buttons (no payment UI)
5. Check console: "IAP disabled (not Android app)"

**Pass Criteria**: Web unaffected by IAP code ✓

---

#### Phase 3: Android IAP Flow (Real Purchase)

**Prerequisites**:
- APK uploaded to Google Play Console → **Internal Testing** track
- Product `wedding_video_download` created and **active** (wait 2-4 hours)
- Test Google account added to Internal Testing testers list
- Install app from Play Store link (NOT sideloaded APK)

**Test Cases**:

1. **✅ Happy Path**:
   - Generate video (NOT dev mode venue)
   - See "Buy & Download (₹10)" button
   - Click → Google Play dialog appears
   - Complete purchase (use test payment method)
   - Video downloads automatically
   - Both Download and Share buttons appear

2. **✅ User Cancellation**:
   - Click "Buy & Download"
   - Press back in Google dialog
   - **Expected**: No error message, stay on ResultScreen

3. **✅ Network Error**:
   - Turn on airplane mode
   - Click "Buy & Download"
   - **Expected**: "Check internet connection" alert

4. **✅ New Video Requires New Purchase**:
   - After successful purchase, click "Start Over"
   - Generate new video
   - **Expected**: "Buy & Download" button again (stateless)

5. **✅ Rapid Clicks**:
   - Click "Buy & Download" multiple times rapidly
   - **Expected**: Button disabled during purchase, no double-charge

**Verify in Play Console**:
- Navigate to: Order management → Search for test email
- See purchase listed with status "Completed"
- Verify product: `wedding_video_download`

---

## How It Works

### Architecture

```
User Flow:
1. Generate video → ResultScreen shows preview
2. Android app shows: "Buy & Download (₹10)" button
3. User clicks → Google Play purchase dialog
4. Purchase completes → auto-download video
5. Button changes to "Download" + "Share" appears
6. "Start Over" → new video requires new purchase (stateless)
```

### Platform Detection

```javascript
// isIAPEnabled() checks:
1. window.Capacitor.getPlatform() === 'android'  // Only Android
2. VITE_MONETIZATION_ENABLED === 'true'         // Feature toggle

// Web browsers return false → free downloads
```

### Dev Mode Bypass

```javascript
// shouldBypassIAP(venue) returns true if:
venue === "Hotel Jain Ji Shubham"

// Allows testing generation flow without purchases
```

---

## Troubleshooting

### "Product not found" Error
- **Cause**: Product not activated or SKU mismatch
- **Fix**:
  1. Wait 2-4 hours after creating product
  2. Verify `VITE_IAP_PRODUCT_SKU` matches Play Console product ID
  3. Check product status is "Active" in Play Console

### Button Shows "Buy & Download" on Web
- **Cause**: `isAndroidApp()` returning true on web
- **Fix**: Check browser console for platform detection logs
- **Verify**: `window.Capacitor` should be undefined on web

### Purchase Completes but No Download
- **Cause**: Transaction not finishing correctly
- **Fix**: Check console logs for "Transaction finished/consumed"
- **Debug**: Add breakpoint in `handlePurchase()` → `handleDownloadInternal()`

### IAP Not Working After App Update
- **Cause**: Plugin not synced or build cache
- **Fix**:
  ```bash
  npx cap sync android
  # Clean build in Android Studio
  ```

### Play Console Shows "Pending" Transactions
- **Cause**: Transaction not consumed (`.finish()` not called)
- **Fix**: Plugin auto-consumes in `.approved()` handler
- **Verify**: Check `iapManager.js` → `store.when().approved()` calls `transaction.finish()`

---

## Rollback Plan

### Emergency Disable (5 minutes)

If IAP breaks in production:

1. **Update `.env.production`**:
   ```bash
   VITE_MONETIZATION_ENABLED=false
   ```

2. **Rebuild & redeploy**:
   ```bash
   npm run build:apk
   ```

3. Upload to Play Console → All users get free downloads

**Alternative**: Push hotfix removing IAP checks from `ResultScreen.jsx`

---

## Monitoring

### What to Watch

1. **Crash Reports**: Google Play Console → Quality → Crashes
   - Search for: "CdvPurchase", "billing", "IAP"

2. **Purchase Volume**: Monetization → Financial reports
   - Track conversion rate (videos generated vs purchases)

3. **User Reviews**: Monitor for payment complaints
   - Common issues: "Button not working", "Charged but no download"

---

## Future Improvements (Out of Scope)

- Server-side receipt validation (prevent fraud)
- Purchase analytics (conversion tracking)
- Multiple pricing tiers (₹10/₹20/₹50)
- Subscription model (unlimited for ₹99/month)
- iOS in-app purchases (separate implementation)

---

## Support

For issues:
- Check console logs: `devLogger("IAPManager")` output
- Verify Play Console product status
- Test with dev mode venue: "Hotel Jain Ji Shubham"
- Review plugin docs: https://github.com/j3k0/cordova-plugin-purchase

**Philosophy**: Ship MVP, iterate based on user feedback. Don't over-engineer for hypothetical requirements.
