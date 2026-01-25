/**
 * Cache Storage Utility
 * 
 * Manages caching of processed images using IndexedDB for large files
 * Falls back to localStorage for metadata
 * 
 * Cache structure:
 * - Processed images stored in IndexedDB with versioning
 * - Metadata (image_id, processing_version, timestamp) in localStorage
 */

import { createDevLogger } from "./devLogger";

const logger = createDevLogger("CacheStorage");

const DB_NAME = "wedding-invite-cache";
const DB_VERSION = 1;
const STORE_NAME = "processed-images";
const METADATA_KEY = "processed-images-metadata";

// Check if IndexedDB is available
function isIndexedDBSupported() {
  try {
    const test = window.indexedDB;
    return !!test;
  } catch {
    return false;
  }
}

/**
 * Initialize IndexedDB for image caching
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      logger.warn("IndexedDB not supported, using localStorage fallback");
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "image_id" });
        logger.log("Created IndexedDB object store");
      }
    };
  });
}

/**
 * Generate a unique image ID based on photo file
 */
export function generateImageId(photoFile) {
  // Create a hash of file size + modification time as unique ID
  const hash = `${photoFile.size}-${photoFile.lastModified}`;
  // Convert to hex-like string
  return btoa(hash).replace(/[+/=]/g, '').substring(0, 16);
}

/**
 * Save processed image to cache
 */
export async function saveCachedImage(imageId, processedImageDataURL) {
  try {
    const timestamp = Date.now();
    const processingVersion = "1.0"; // Update when processing logic changes

    // Try IndexedDB first
    if (isIndexedDBSupported()) {
      try {
        const db = await openDatabase();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // Convert data URL to Blob for storage
        const blob = dataURLToBlob(processedImageDataURL);

        store.put({
          image_id: imageId,
          data: blob,
          processing_version: processingVersion,
          timestamp,
        });

        await new Promise((resolve, reject) => {
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });

        logger.log("Image cached in IndexedDB", {
          image_id: imageId,
          size: `${(blob.size / 1024).toFixed(1)} KB`,
          timestamp,
        });
      } catch (indexedDbError) {
        logger.warn("IndexedDB save failed, trying localStorage", indexedDbError.message);
        // Fall back to localStorage for small data
        saveMetadataToLocalStorage(imageId, processingVersion, timestamp);
      }
    } else {
      saveMetadataToLocalStorage(imageId, processingVersion, timestamp);
    }
  } catch (error) {
    logger.error("Failed to cache image", error.message);
    // Non-fatal error - continue without cache
  }
}

/**
 * Load processed image from cache
 */
export async function loadCachedImage(imageId) {
  try {
    // Check metadata first
    const metadata = loadMetadataFromLocalStorage(imageId);
    if (!metadata) {
      logger.log("No cached image found for ID", { image_id: imageId });
      return null;
    }

    // Try to load from IndexedDB
    if (isIndexedDBSupported()) {
      try {
        const db = await openDatabase();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(imageId);

        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result) {
              logger.log("Retrieved cached image from IndexedDB", {
                image_id: imageId,
                timestamp: result.timestamp,
              });
              // Convert Blob back to data URL
              const reader = new FileReader();
              reader.onload = () => {
                resolve(reader.result);
              };
              reader.onerror = () => {
                logger.warn("Failed to read cached blob");
                resolve(null);
              };
              reader.readAsDataURL(result.data);
            } else {
              logger.log("Image not found in IndexedDB");
              resolve(null);
            }
          };
          request.onerror = () => reject(request.error);
        });
      } catch (indexedDbError) {
        logger.warn("IndexedDB load failed", indexedDbError.message);
        return null;
      }
    }

    return null;
  } catch (error) {
    logger.error("Failed to load cached image", error.message);
    return null;
  }
}

/**
 * Clear cache for a specific image
 */
export async function clearImageCache(imageId) {
  try {
    // Remove metadata
    clearMetadataFromLocalStorage(imageId);

    // Try to remove from IndexedDB
    if (isIndexedDBSupported()) {
      try {
        const db = await openDatabase();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.delete(imageId);

        await new Promise((resolve, reject) => {
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });

        logger.log("Cleared cache for image", { image_id: imageId });
      } catch (error) {
        logger.warn("Failed to clear IndexedDB cache", error.message);
      }
    }
  } catch (error) {
    logger.error("Failed to clear image cache", error.message);
  }
}

/**
 * Save metadata to localStorage (for quick checks)
 */
function saveMetadataToLocalStorage(imageId, processingVersion, timestamp) {
  try {
    const metadata = {
      image_id: imageId,
      processing_version: processingVersion,
      timestamp,
      cached_at: new Date().toISOString(),
    };
    localStorage.setItem(`${METADATA_KEY}-${imageId}`, JSON.stringify(metadata));
    logger.log("Saved metadata to localStorage", { image_id: imageId });
  } catch (error) {
    logger.warn("Failed to save metadata to localStorage", error.message);
  }
}

/**
 * Load metadata from localStorage
 */
function loadMetadataFromLocalStorage(imageId) {
  try {
    const metadata = localStorage.getItem(`${METADATA_KEY}-${imageId}`);
    return metadata ? JSON.parse(metadata) : null;
  } catch (error) {
    logger.warn("Failed to load metadata from localStorage", error.message);
    return null;
  }
}

/**
 * Clear metadata from localStorage
 */
function clearMetadataFromLocalStorage(imageId) {
  try {
    localStorage.removeItem(`${METADATA_KEY}-${imageId}`);
  } catch (error) {
    logger.warn("Failed to clear metadata from localStorage", error.message);
  }
}

/**
 * Convert data URL to Blob
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
 * Check cache validity based on processing version
 */
export function isCacheValid(metadata, currentProcessingVersion = "1.0") {
  if (!metadata) return false;
  if (metadata.processing_version !== currentProcessingVersion) {
    logger.log("Cache invalid due to processing version mismatch", {
      cached_version: metadata.processing_version,
      current_version: currentProcessingVersion,
    });
    return false;
  }
  return true;
}