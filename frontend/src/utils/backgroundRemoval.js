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

import { createDevLogger } from "./devLogger";

const logger = createDevLogger("BgRemoval");

// Lazy-loaded module reference
let removeBackgroundFn = null;
let loadingPromise = null;

// Configuration for background removal
const REMOVAL_CONFIG = {
  model: "small",  // "small" | "medium" | "large" - balance speed/quality
  output: {
    format: "image/png",
    quality: 1.0,
  },
  // Progress callback is optional
  progress: (key, current, total) => {
    if (key === "compute:inference") {
      const percent = Math.round((current / total) * 100);
      logger.log(`Processing: ${percent}%`);
    }
  },
};

/**
 * Dynamically loads the background removal library
 */
async function loadLibrary() {
  if (removeBackgroundFn) {
    logger.log("Library already loaded, using cached reference");
    return removeBackgroundFn;
  }
  
  if (loadingPromise) {
    logger.log("Library loading in progress, waiting...");
    return loadingPromise;
  }
  
  logger.log("Loading library dynamically...");
  const startTime = performance.now();

  loadingPromise = import("@imgly/background-removal").then((module) => {
    removeBackgroundFn = module.removeBackground;
    const duration = performance.now() - startTime;
    logger.log("Library loaded", { duration: `${duration.toFixed(0)}ms` });
    return removeBackgroundFn;
  }).catch((err) => {
    loadingPromise = null;
    throw err;
  });
  
  return loadingPromise;
}

/**
 * Converts a base64 data URL to a Blob
 */
export function dataURLToBlob(dataURL) {
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
  logger.log("Starting background removal", {
    inputLength: imageDataURL?.length,
  });
  const startTime = performance.now();

  try {
    // Load library dynamically if not already loaded
    logger.log("Step 1: Loading library");
    const removeBackground = await loadLibrary();

    // Convert data URL to Blob
    logger.log("Step 2: Converting data URL to Blob");
    const inputBlob = dataURLToBlob(imageDataURL);

    logger.log("Step 2 complete: Input prepared", {
      inputSize: `${(inputBlob.size / 1024).toFixed(1)} KB`,
    });

    // Remove background
    logger.log("Step 3: Calling removeBackground() - this may take a while...");
    const removeStartTime = performance.now();

    const resultBlob = await removeBackground(inputBlob, REMOVAL_CONFIG);
    const removeDuration = performance.now() - removeStartTime;

    logger.log("Step 3 complete: Background removed", {
      processingTime: `${removeDuration.toFixed(0)}ms`,
      resultSize: `${(resultBlob.size / 1024).toFixed(1)} KB`,
    });

    // Convert result back to data URL
    logger.log("Step 4: Converting result to data URL");
    const resultDataURL = await blobToDataURL(resultBlob);

    const duration = performance.now() - startTime;
    logger.log("Background removal complete", {
      totalDuration: `${duration.toFixed(0)}ms`,
      inputSize: `${(inputBlob.size / 1024).toFixed(1)} KB`,
      outputSize: `${(resultBlob.size / 1024).toFixed(1)} KB`,
    });

    return resultDataURL;
  } catch (error) {
    logger.error("Background removal failed", error);
    throw new Error(`Background removal failed: ${error.message}`);
  }
}
