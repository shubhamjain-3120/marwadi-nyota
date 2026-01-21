/**
 * Phase 4: Background Removal Utility
 *
 * Uses @imgly/background-removal for deterministic, client-side
 * background removal from AI-generated images.
 *
 * The library uses a pre-trained ML model that runs in the browser
 * via WebAssembly/WebGL, providing consistent results without
 * external API calls.
 * 
 * NOTE: We use dynamic imports to avoid blocking initial page load.
 * The library is only loaded when actually needed.
 */

// Lazy-loaded module reference
let removeBackgroundFn = null;
let loadingPromise = null;

// Configuration for background removal
const REMOVAL_CONFIG = {
  model: "medium",  // "small" | "medium" | "large" - balance speed/quality
  output: {
    format: "image/png",
    quality: 1.0,
  },
  // Progress callback is optional
  progress: (key, current, total) => {
    if (key === "compute:inference") {
      const percent = Math.round((current / total) * 100);
      console.log(`[BgRemoval] Processing: ${percent}%`);
    }
  },
};

/**
 * Dynamically loads the background removal library
 */
async function loadLibrary() {
  if (removeBackgroundFn) {
    return removeBackgroundFn;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  console.log("[BgRemoval] Loading library dynamically...");
  loadingPromise = import("@imgly/background-removal").then((module) => {
    removeBackgroundFn = module.removeBackground;
    console.log("[BgRemoval] Library loaded");
    return removeBackgroundFn;
  });
  
  return loadingPromise;
}

/**
 * Converts a base64 data URL to a Blob
 */
function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mimeType });
}

/**
 * Converts a Blob to a base64 data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Removes the background from an image.
 *
 * @param {string} imageDataURL - Base64 data URL of the image (e.g., "data:image/png;base64,...")
 * @returns {Promise<string>} - Base64 data URL of the image with transparent background
 */
export async function removeImageBackground(imageDataURL) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundRemoval.js:removeImageBackground:start',message:'Starting background removal',data:{inputLength:imageDataURL?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  console.log("[BgRemoval] Starting background removal...");
  const startTime = performance.now();

  try {
    // Load library dynamically if not already loaded
    const removeBackground = await loadLibrary();
    
    // Convert data URL to Blob
    const inputBlob = dataURLToBlob(imageDataURL);
    console.log(`[BgRemoval] Input size: ${(inputBlob.size / 1024).toFixed(1)} KB`);

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundRemoval.js:removeImageBackground:beforeRemove',message:'About to call removeBackground()',data:{inputSizeKB:(inputBlob.size/1024).toFixed(1)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Remove background
    const resultBlob = await removeBackground(inputBlob, REMOVAL_CONFIG);

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundRemoval.js:removeImageBackground:afterRemove',message:'removeBackground() returned',data:{resultSizeKB:(resultBlob.size/1024).toFixed(1)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Convert result back to data URL
    const resultDataURL = await blobToDataURL(resultBlob);

    const duration = performance.now() - startTime;
    console.log(`[BgRemoval] Complete in ${duration.toFixed(0)}ms`);
    console.log(`[BgRemoval] Output size: ${(resultBlob.size / 1024).toFixed(1)} KB`);

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundRemoval.js:removeImageBackground:done',message:'Background removal complete',data:{durationMs:duration.toFixed(0),outputSizeKB:(resultBlob.size/1024).toFixed(1)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    return resultDataURL;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundRemoval.js:removeImageBackground:error',message:'Background removal error',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error("[BgRemoval] Error:", error);
    throw new Error(`Background removal failed: ${error.message}`);
  }
}

/**
 * Preloads the background removal model.
 * Call this early in the app lifecycle to reduce latency on first use.
 * Now uses dynamic import to avoid blocking initial page load.
 */
export async function preloadBackgroundRemovalModel() {
  console.log("[BgRemoval] Preloading model...");
  const startTime = performance.now();

  try {
    // First, dynamically load the library
    const removeBackground = await loadLibrary();
    
    // Create a tiny dummy image to trigger model loading
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 10, 10);
    ctx.fillStyle = "#000000";
    ctx.fillRect(2, 2, 6, 6);

    const dummyBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    // Run background removal to load the model
    await removeBackground(dummyBlob, {
      ...REMOVAL_CONFIG,
      progress: () => {}, // Silent progress
    });

    const duration = performance.now() - startTime;
    console.log(`[BgRemoval] Model preloaded in ${duration.toFixed(0)}ms`);
  } catch (error) {
    console.warn("[BgRemoval] Preload failed (will retry on first use):", error.message);
  }
}

/**
 * Checks if the background removal library is available and working.
 */
export async function checkBackgroundRemovalSupport() {
  try {
    // Check for required APIs
    if (typeof WebAssembly === "undefined") {
      return { supported: false, reason: "WebAssembly not supported" };
    }

    // The library should be importable if dependencies are met
    return { supported: true };
  } catch (error) {
    return { supported: false, reason: error.message };
  }
}
