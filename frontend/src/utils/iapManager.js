/**
 * IAP Manager for Google Play In-App Purchases
 *
 * Handles consumable video download purchases for Android app.
 * Web version always returns false for isIAPEnabled() to remain free.
 */

import { createDevLogger } from './devLogger';

const logger = createDevLogger('IAPManager');

// Environment configuration
const MONETIZATION_ENABLED = import.meta.env.VITE_MONETIZATION_ENABLED === 'true';
const PRODUCT_SKU = import.meta.env.VITE_IAP_PRODUCT_SKU || 'wedding_video_download';
const PRICE_DISPLAY = import.meta.env.VITE_IAP_PRICE_DISPLAY || '₹10';

// Dev mode bypass venue
const DEV_MODE_VENUE = 'Hotel Jain Ji Shubham';

// Plugin instance (lazy loaded)
let store = null;
let isInitialized = false;

/**
 * Check if running on Android app (not web)
 */
function isAndroidApp() {
  return typeof window.Capacitor !== 'undefined' &&
         window.Capacitor.getPlatform() === 'android';
}

/**
 * Check if IAP is enabled for current platform
 * @returns {boolean} True if Android app with monetization enabled
 */
export function isIAPEnabled() {
  const enabled = isAndroidApp() && MONETIZATION_ENABLED;
  if (!enabled) {
    logger.log('IAP disabled', {
      isAndroid: isAndroidApp(),
      monetizationEnabled: MONETIZATION_ENABLED,
      platform: typeof window.Capacitor !== 'undefined' ? window.Capacitor.getPlatform() : 'web',
    });
  }
  return enabled;
}

/**
 * Check if should bypass IAP (dev mode)
 * @param {string} venue - Wedding venue name from form
 * @returns {boolean} True if dev mode venue detected
 */
export function shouldBypassIAP(venue) {
  const bypass = venue === DEV_MODE_VENUE;
  if (bypass) {
    logger.log('Dev mode detected - bypassing IAP', { venue });
  }
  return bypass;
}

/**
 * Initialize IAP system
 * Call once at app startup (idempotent - safe to call multiple times)
 *
 * @returns {Promise<void>}
 * @throws {Error} If plugin not available or initialization fails
 */
export async function initializeIAP() {
  // Skip if not enabled
  if (!isIAPEnabled()) {
    logger.log('Skipping IAP initialization (not enabled)');
    return;
  }

  // Skip if already initialized
  if (isInitialized && store) {
    logger.log('IAP already initialized');
    return;
  }

  try {
    // Access plugin
    if (!window.CdvPurchase) {
      throw new Error('CdvPurchase plugin not available');
    }

    store = window.CdvPurchase.store;
    logger.log('IAP plugin loaded', { version: window.CdvPurchase.store.version });

    // Register product
    store.register([{
      id: PRODUCT_SKU,
      type: store.CONSUMABLE,
      platform: store.Platform.GOOGLE_PLAY,
    }]);

    logger.log('Product registered', { sku: PRODUCT_SKU });

    // Setup event handlers
    store.when().approved((transaction) => {
      logger.log('Transaction approved', {
        id: transaction.transactionId,
        product: transaction.products[0]?.id,
      });

      // Finish transaction immediately (consume it)
      transaction.finish();
      logger.log('Transaction finished/consumed');
    });

    store.when().verified((receipt) => {
      logger.log('Receipt verified', {
        id: receipt.id,
        products: receipt.products?.map(p => p.id),
      });
    });

    store.error((err) => {
      logger.error('Store error', err);
    });

    // Initialize store (connects to Google Play)
    await store.initialize([store.Platform.GOOGLE_PLAY]);

    isInitialized = true;
    logger.log('IAP initialized successfully');

  } catch (err) {
    logger.error('IAP initialization failed', err);
    throw err;
  }
}

/**
 * Get product information from Play Store
 * @returns {Object|null} Product info with price, title, description
 */
export function getProductInfo() {
  if (!isInitialized || !store) {
    logger.warn('IAP not initialized - cannot get product info');
    return null;
  }

  try {
    const product = store.get(PRODUCT_SKU);

    if (!product) {
      logger.warn('Product not found in store', { sku: PRODUCT_SKU });
      return null;
    }

    const info = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.pricing?.price || PRICE_DISPLAY, // Fallback to env var
      currency: product.pricing?.currency || 'INR',
    };

    logger.log('Product info retrieved', info);
    return info;

  } catch (err) {
    logger.error('Failed to get product info', err);
    return null;
  }
}

/**
 * Purchase video download (consumable)
 *
 * @returns {Promise<Object>} Result object: { success: boolean, error?: string }
 */
export async function purchaseVideoDownload() {
  if (!isInitialized || !store) {
    return {
      success: false,
      error: 'IAP not initialized. Please restart the app.'
    };
  }

  try {
    logger.log('Starting purchase flow', { sku: PRODUCT_SKU });

    const product = store.get(PRODUCT_SKU);

    if (!product) {
      logger.error('Product not found', { sku: PRODUCT_SKU });
      return {
        success: false,
        error: 'Product not found. Please check your internet connection.'
      };
    }

    // Get offer and initiate purchase
    const offer = product.getOffer();
    if (!offer) {
      logger.error('No offer available for product');
      return {
        success: false,
        error: 'Product not available. Please try again later.'
      };
    }

    logger.log('Initiating purchase with offer', {
      offerId: offer.id,
      price: offer.pricing?.price,
    });

    // order() returns a promise in v13+
    const result = await offer.order();

    logger.log('Purchase flow completed', {
      result: result?.code || 'unknown',
      transactionId: result?.data?.transactionId,
    });

    // Check if purchase was successful
    // The approved handler will auto-consume the transaction
    if (result && (result.code === 'OK' || result.isError === false)) {
      return { success: true };
    } else if (result?.code === 'USER_CANCELLED') {
      logger.log('User cancelled purchase');
      return { success: false, error: 'cancelled' };
    } else {
      logger.error('Purchase failed', result);
      return {
        success: false,
        error: result?.message || 'Purchase failed. Please try again.'
      };
    }

  } catch (err) {
    logger.error('Purchase error', err);

    // Handle user cancellation (not an error)
    if (err.code === 'USER_CANCELLED' || err.message?.includes('cancel')) {
      return { success: false, error: 'cancelled' };
    }

    // Network error
    if (err.message?.includes('network') || err.message?.includes('connection')) {
      return {
        success: false,
        error: 'Check your internet connection and try again.'
      };
    }

    // Generic error
    return {
      success: false,
      error: err.message || 'Something went wrong. Please try again.'
    };
  }
}
