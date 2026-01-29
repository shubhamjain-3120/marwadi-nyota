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
 *
 * RELIABILITY IMPROVEMENTS:
 * - Validates that background was actually removed (checks alpha channel)
 * - Retries on failure with exponential backoff
 * - Falls back to server-side removal if client-side fails
 * - No silent failures - always throws if completely failed
 */

import { createDevLogger } from "./devLogger";

const logger = createDevLogger("BgRemoval");

// Maximum retries for client-side background removal
const MAX_CLIENT_RETRIES = 2;

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
 * Validates that background removal actually worked by checking alpha channel
 * Returns true if transparency exists (background was removed)
 */
async function validateBackgroundRemoved(imageDataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check if any pixels have transparency (alpha < 255)
        let transparentPixels = 0;
        const totalPixels = data.length / 4;

        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            transparentPixels++;
          }
        }

        const transparencyPercent = (transparentPixels / totalPixels) * 100;
        logger.log("Background removal validation", {
          transparentPixels,
          totalPixels,
          transparencyPercent: transparencyPercent.toFixed(2) + "%",
        });

        // If at least 5% of pixels are transparent, consider it successful
        resolve(transparencyPercent >= 5);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for validation"));
    img.src = imageDataURL;
  });
}

/**
 * Server-side background removal fallback
 */
async function removeBackgroundServer(imageDataURL, apiUrl) {
  logger.log("Attempting server-side background removal");

  // Convert data URL to blob
  const blob = dataURLToBlob(imageDataURL);

  // Create form data
  const formData = new FormData();
  formData.append("image", blob, "image.png");

  // Call server endpoint
  const response = await fetch(`${apiUrl}/api/remove-background`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Server-side background removal failed");
  }

  return result.imageDataURL;
}

/**
 * Removes the background from an image.
 * Tries client-side first with retries, falls back to server if needed.
 *
 * @param {string} imageDataURL - Base64 data URL of the image (e.g., "data:image/png;base64,...")
 * @param {string} [apiUrl=""] - API URL for server-side fallback
 * @returns {Promise<string>} - Base64 data URL of the image with transparent background
 */
export async function removeImageBackground(imageDataURL, apiUrl = "") {
  logger.log("Starting background removal", {
    inputLength: imageDataURL?.length,
  });
  const startTime = performance.now();

  // Try client-side removal with retries
  let lastClientError = null;
  for (let attempt = 1; attempt <= MAX_CLIENT_RETRIES; attempt++) {
    try {
      logger.log(`Client-side attempt ${attempt}/${MAX_CLIENT_RETRIES}`);

      // Load library dynamically if not already loaded
      logger.log("Step 1: Loading library");
      const removeBackground = await loadLibrary();

      // Convert data URL to Blob
      logger.log("Step 2: Converting data URL to Blob");
      const inputBlob = dataURLToBlob(imageDataURL);

      logger.log("Step 2 complete: Input prepared", {
        inputSize: `${(inputBlob.size / 1024).toFixed(1)} KB`,
      });

      // Remove background with timeout
      logger.log("Step 3: Calling removeBackground() - this may take a while...");
      const removeStartTime = performance.now();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Client-side timeout (120s)")), 120000)
      );

      const resultBlob = await Promise.race([
        removeBackground(inputBlob, REMOVAL_CONFIG),
        timeoutPromise,
      ]);

      const removeDuration = performance.now() - removeStartTime;

      logger.log("Step 3 complete: Background removed", {
        processingTime: `${removeDuration.toFixed(0)}ms`,
        resultSize: `${(resultBlob.size / 1024).toFixed(1)} KB`,
      });

      // Convert result back to data URL
      logger.log("Step 4: Converting result to data URL");
      const resultDataURL = await blobToDataURL(resultBlob);

      // Validate that background was actually removed
      logger.log("Step 5: Validating background removal");
      const isValid = await validateBackgroundRemoved(resultDataURL);

      if (!isValid) {
        throw new Error("Background removal validation failed - no transparency detected");
      }

      const duration = performance.now() - startTime;
      logger.log("Background removal complete (client-side)", {
        totalDuration: `${duration.toFixed(0)}ms`,
        inputSize: `${(inputBlob.size / 1024).toFixed(1)} KB`,
        outputSize: `${(resultBlob.size / 1024).toFixed(1)} KB`,
        attempts: attempt,
      });

      return resultDataURL;
    } catch (error) {
      lastClientError = error;
      logger.warn(`Client-side attempt ${attempt} failed: ${error.message}`);

      // Wait before retry (exponential backoff)
      if (attempt < MAX_CLIENT_RETRIES) {
        const delay = 1000 * attempt;
        logger.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All client-side attempts failed - try server-side fallback
  logger.warn(
    `Client-side background removal failed after ${MAX_CLIENT_RETRIES} attempts, trying server-side fallback`,
    lastClientError.message
  );

  try {
    const resultDataURL = await removeBackgroundServer(imageDataURL, apiUrl);

    // Validate server result
    const isValid = await validateBackgroundRemoved(resultDataURL);
    if (!isValid) {
      throw new Error("Server-side background removal validation failed");
    }

    const duration = performance.now() - startTime;
    logger.log("Background removal complete (server-side)", {
      totalDuration: `${duration.toFixed(0)}ms`,
    });

    return resultDataURL;
  } catch (serverError) {
    logger.error("Server-side background removal also failed", serverError);
    throw new Error(
      `Background removal failed completely. Client: ${lastClientError.message}. Server: ${serverError.message}`
    );
  }
}
