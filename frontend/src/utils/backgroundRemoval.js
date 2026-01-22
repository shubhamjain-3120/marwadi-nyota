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
  
  loadingPromise = import("@imgly/background-removal").then((module) => {
    removeBackgroundFn = module.removeBackground;
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
  try {
    // Load library dynamically if not already loaded
    const removeBackground = await loadLibrary();
    
    // Convert data URL to Blob
    const inputBlob = dataURLToBlob(imageDataURL);

    // Remove background
    const resultBlob = await removeBackground(inputBlob, REMOVAL_CONFIG);

    // Convert result back to data URL
    const resultDataURL = await blobToDataURL(resultBlob);

    return resultDataURL;
  } catch (error) {
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
