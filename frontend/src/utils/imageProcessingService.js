/**
 * Image Processing Service
 * 
 * Background processing pipeline that runs asynchronously after photo upload
 * State machine: uploaded → extracting → generating → evaluating → bg_removed → ready
 * 
 * Features:
 * - Timeout + retry logic for each step
 * - Fail graceful with fallback
 * - Progress tracking
 * - Cancellation support
 */

import { createDevLogger } from "./devLogger";
import { removeImageBackground } from "./backgroundRemoval";
import { generateImageId, saveCachedImage, loadCachedImage, isCacheValid } from "./cacheStorage";

const logger = createDevLogger("ImageProcessing");

// Processing version for cache validation
export const PROCESSING_VERSION = "1.0";

// Timeout durations (ms)
const TIMEOUTS = {
  extraction: 60000,      // 60s - Image extraction & face detection
  generation: 300000,     // 5m - Image generation/enhancement
  evaluation: 60000,      // 60s - Quality scoring
  bg_removing: 120000,    // 2m - Background removal (key matches stepName)
};

// Retry configuration
const RETRIES = {
  extraction: 2,
  generation: 1,
  evaluation: 2,
  bg_removing: 1,         // key matches stepName used in _runStep
};

// State machine states
export const STATES = {
  IDLE: "idle",
  UPLOADED: "uploaded",
  EXTRACTING: "extracting",
  GENERATING: "generating",
  EVALUATING: "evaluating",
  BG_REMOVING: "bg_removing",
  READY: "ready",
  FAILED: "failed",
};

/**
 * Image Processing Service - Manages background processing pipeline
 */
export class ImageProcessingService {
  constructor() {
    this.state = STATES.IDLE;
    this.imageId = null;
    this.originalImage = null;
    this.processedImage = null;
    this.currentStep = null;
    this.progress = 0;
    this.error = null;
    this.abortController = null;
    this.listeners = [];
    this.extractionComplete = false;
    this.extractedDescriptions = null;
    this.isPhotoProcessed = false; // extraction + generation + evaluation + bg removal all complete
  }

  /**
   * Subscribe to state changes
   */
  on(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  _notify() {
    this.listeners.forEach(callback => {
      callback({
        state: this.state,
        step: this.currentStep,
        progress: this.progress,
        error: this.error,
        processedImage: this.processedImage,
        extractionComplete: this.extractionComplete,
        isPhotoProcessed: this.isPhotoProcessed,
      });
    });
  }

  /**
   * Start processing from generation step (extraction already done)
   */
  async startProcessingFromGeneration(photoFile, apiUrl, extractedDescriptions, options = {}) {
    // Check if already processing
    if (this.state !== STATES.IDLE && this.state !== STATES.UPLOADED) {
      logger.warn("Already processing, cannot start new pipeline", { current_state: this.state });
      return;
    }

    this.abortController = new AbortController();
    this.imageId = generateImageId(photoFile);
    this.originalImage = photoFile;
    this.error = null;
    this.progress = 0;
    this.extractionComplete = true;
    this.extractedDescriptions = extractedDescriptions;
    this.isPhotoProcessed = false;

    logger.log("Starting image processing from generation step", {
      image_id: this.imageId,
      photoSize: `${(photoFile.size / 1024).toFixed(1)} KB`,
      photoType: photoFile.type,
      hasDescriptions: !!extractedDescriptions,
    });

    // Check cache first
    try {
      const cached = await loadCachedImage(this.imageId);
      if (cached && isCacheValid({ processing_version: PROCESSING_VERSION })) {
        logger.log("Using cached processed image", { image_id: this.imageId });
        this.processedImage = cached;
        this.state = STATES.READY;
        this.progress = 100;
        this.isPhotoProcessed = true;
        this._notify();
        return;
      }
    } catch (error) {
      logger.warn("Failed to check cache, continuing with pipeline", error.message);
    }

    // Start pipeline from generation (extraction already done)
    this.state = STATES.UPLOADED;
    this._notify();

    try {
      // Skip extraction, start from generation
      // Step 1: Generation/Enhancement (if API enabled)
      if (!options.skipImageGeneration) {
        await this._runStep(
          "generation",
          () => this._generateImage(photoFile, apiUrl, options),
          "Enhancing your image..."
        );
      }

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Step 2: Evaluation
      if (!options.skipEvaluation) {
        await this._runStep(
          "evaluation",
          () => this._evaluateImage(photoFile, apiUrl, options),
          "Evaluating image quality..."
        );
      }

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Step 3: Background Removal
      await this._runStep(
        "bg_removing",
        () => this._removeBackground(),
        "Removing background..."
      );

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Save to cache
      try {
        await saveCachedImage(this.imageId, this.processedImage);
      } catch (error) {
        logger.warn("Failed to save to cache, continuing", error.message);
      }

      // Mark as ready and photo processed
      this.state = STATES.READY;
      this.progress = 100;
      this.isPhotoProcessed = true;
      this._notify();

      logger.log("Image processing pipeline complete (from generation)", {
        image_id: this.imageId,
        finalImageSize: `${(this._estimateDataURLSize(this.processedImage) / 1024).toFixed(1)} KB`,
        isPhotoProcessed: this.isPhotoProcessed,
      });

    } catch (error) {
      if (error.name === "AbortError") {
        logger.log("Processing cancelled by user");
        this.state = STATES.IDLE;
      } else {
        logger.error("Pipeline failed", error.message);
        this.error = error.message;
        this.state = STATES.FAILED;
        // Use original image as fallback
        this.processedImage = await this._fileToDataURL(this.originalImage);
      }
      this._notify();
    }
  }

  /**
   * Start processing an uploaded photo
   */
  async startProcessing(photoFile, apiUrl, options = {}) {
    // Check if already processing
    if (this.state !== STATES.IDLE && this.state !== STATES.UPLOADED) {
      logger.warn("Already processing, cannot start new pipeline", { current_state: this.state });
      return;
    }

    this.abortController = new AbortController();
    this.imageId = generateImageId(photoFile);
    this.originalImage = photoFile;
    this.error = null;
    this.progress = 0;
    this.extractionComplete = false;
    this.extractedDescriptions = null;
    this.isPhotoProcessed = false;

    logger.log("Starting image processing pipeline", {
      image_id: this.imageId,
      photoSize: `${(photoFile.size / 1024).toFixed(1)} KB`,
      photoType: photoFile.type,
    });

    // Check cache first
    try {
      const cached = await loadCachedImage(this.imageId);
      if (cached && isCacheValid({ processing_version: PROCESSING_VERSION })) {
        logger.log("Using cached processed image", { image_id: this.imageId });
        this.processedImage = cached;
        this.state = STATES.READY;
        this.progress = 100;
        this._notify();
        return;
      }
    } catch (error) {
      logger.warn("Failed to check cache, continuing with pipeline", error.message);
    }

    // Start pipeline
    this.state = STATES.UPLOADED;
    this._notify();

    try {
      // Step 1: Extraction
      await this._runStep(
        "extraction",
        () => this._extractImage(photoFile),
        "Extracting image features..."
      );

      // Mark extraction as complete
      this.extractionComplete = true;
      this._notify();

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Step 2: Generation/Enhancement (if API enabled)
      if (!options.skipImageGeneration) {
        await this._runStep(
          "generation",
          () => this._generateImage(photoFile, apiUrl, options),
          "Enhancing your image..."
        );
      }

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Step 3: Evaluation
      if (!options.skipEvaluation) {
        await this._runStep(
          "evaluation",
          () => this._evaluateImage(photoFile, apiUrl, options),
          "Evaluating image quality..."
        );
      }

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Step 4: Background Removal
      await this._runStep(
        "bg_removing",
        () => this._removeBackground(),
        "Removing background..."
      );

      if (this.abortController.signal.aborted) {
        this._abort();
        return;
      }

      // Save to cache
      try {
        await saveCachedImage(this.imageId, this.processedImage);
      } catch (error) {
        logger.warn("Failed to save to cache, continuing", error.message);
      }

      // Mark as ready and photo processed
      this.state = STATES.READY;
      this.progress = 100;
      this.isPhotoProcessed = true;
      this._notify();

      logger.log("Image processing pipeline complete", {
        image_id: this.imageId,
        finalImageSize: `${(this._estimateDataURLSize(this.processedImage) / 1024).toFixed(1)} KB`,
        isPhotoProcessed: this.isPhotoProcessed,
      });

    } catch (error) {
      if (error.name === "AbortError") {
        logger.log("Processing cancelled by user");
        this.state = STATES.IDLE;
      } else {
        logger.error("Pipeline failed", error.message);
        this.error = error.message;
        this.state = STATES.FAILED;
        // Use original image as fallback
        this.processedImage = await this._fileToDataURL(this.originalImage);
      }
      this._notify();
    }
  }

  /**
   * Run a single processing step with timeout and retry logic
   */
  async _runStep(stepName, stepFn, userMessage) {
    const timeout = TIMEOUTS[stepName];
    const maxRetries = RETRIES[stepName];

    this.currentStep = stepName;
    this.state = this._stateForStep(stepName);
    this._notify();

    logger.log(`Step ${stepName} starting`, { userMessage, timeout, maxRetries });

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Run step with timeout
        const result = await this._withTimeout(stepFn(), timeout);
        logger.log(`Step ${stepName} completed`, { attempt: attempt + 1 });
        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`Step ${stepName} failed on attempt ${attempt + 1}`, {
          error: error.message,
          willRetry: attempt < maxRetries - 1,
        });

        if (attempt < maxRetries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Step ${stepName} failed after ${maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Map step name to state
   */
  _stateForStep(stepName) {
    const stateMap = {
      extraction: STATES.EXTRACTING,
      generation: STATES.GENERATING,
      evaluation: STATES.EVALUATING,
      bg_removing: STATES.BG_REMOVING,
    };
    return stateMap[stepName] || STATES.IDLE;
  }

  /**
   * Extract image (convert file to data URL)
   */
  async _extractImage(photoFile) {
    this.progress = 10;
    this._notify();

    // Convert file to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.processedImage = reader.result;
        this.progress = 20;
        this._notify();
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(photoFile);
    });
  }

  /**
   * Generate/enhance image via API
   */
  async _generateImage(photoFile, apiUrl, options) {
    this.progress = 30;
    this._notify();

    // Call API for image generation (if not skipping)
    if (options.skipImageGeneration) {
      return this.processedImage;
    }

    const formData = new FormData();
    formData.append("photo", photoFile);

    const response = await fetch(`${apiUrl}/api/generate`, {
      method: "POST",
      body: formData,
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Generation failed");
    }

    this.processedImage = result.characterImage;
    this.progress = 40;
    this._notify();

    return this.processedImage;
  }

  /**
   * Evaluate image quality
   */
  async _evaluateImage(photoFile, apiUrl, options) {
    this.progress = 50;
    this._notify();

    // Quality evaluation (already done via API if image was generated)
    // This is a placeholder for future additional evaluation
    this.progress = 60;
    this._notify();

    return { passed: true, score: 1.0 };
  }

  /**
   * Remove background from image
   */
  async _removeBackground() {
    this.progress = 70;
    this._notify();

    try {
      this.processedImage = await removeImageBackground(this.processedImage);
      this.progress = 80;
      this._notify();
      return this.processedImage;
    } catch (error) {
      // Fallback: use original image without background removal
      logger.warn("Background removal failed, using original image", error.message);
      this.progress = 80;
      this._notify();
      return this.processedImage;
    }
  }

  /**
   * Cancel processing
   */
  cancel() {
    logger.log("Cancelling image processing");
    if (this.abortController) {
      this.abortController.abort();
    }
    this._abort();
  }

  /**
   * Check if photo is fully processed (extraction + generation + evaluation + bg removal)
   */
  isPhotoFullyProcessed() {
    return this.isPhotoProcessed;
  }

  /**
   * Mark as aborted
   */
  _abort() {
    this.state = STATES.IDLE;
    this.progress = 0;
    this.currentStep = null;
    this._notify();
  }

  /**
   * Run async operation with timeout
   */
  _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
      ),
    ]);
  }

  /**
   * Convert File to data URL
   */
  _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Estimate data URL size in bytes
   */
  _estimateDataURLSize(dataURL) {
    if (!dataURL) return 0;
    // Data URL overhead + base64 size (each 4 base64 chars = 3 bytes)
    const base64Part = dataURL.split(",")[1] || "";
    return Math.ceil(base64Part.length * 0.75);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      state: this.state,
      step: this.currentStep,
      progress: this.progress,
      error: this.error,
      isReady: this.state === STATES.READY,
      isFailed: this.state === STATES.FAILED,
      processedImage: this.processedImage,
      extractionComplete: this.extractionComplete,
      isPhotoProcessed: this.isPhotoProcessed,
    };
  }

  /**
   * Check if processing is done
   */
  isDone() {
    return this.state === STATES.READY || this.state === STATES.FAILED;
  }

  /**
   * Check if image is ready for use
   */
  isImageReady() {
    return this.state === STATES.READY && !!this.processedImage;
  }
}

// Singleton instance
let serviceInstance = null;

export function getImageProcessingService() {
  if (!serviceInstance) {
    serviceInstance = new ImageProcessingService();
  }
  return serviceInstance;
}

export function resetImageProcessingService() {
  if (serviceInstance) {
    serviceInstance.cancel();
    serviceInstance = null;
  }
}