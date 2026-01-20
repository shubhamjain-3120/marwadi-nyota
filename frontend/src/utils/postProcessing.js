/**
 * Phase 3: Post-Processing Pipeline
 *
 * Transforms AI-generated character images into premium wedding invite artwork
 * through deterministic, client-side canvas operations.
 *
 * Pipeline Order:
 * 1. Edge Feathering - Soften hard cutout edges
 * 2. Ground Shadow - Add grounding shadow under feet
 * 3. Color Harmonization - Tint toward background palette
 * 4. Contrast & Gamma - Enhance mid-tones and richness
 */

// ============================================================================
// CONFIGURATION - Tunable Parameters
// ============================================================================
export const POST_PROCESS_CONFIG = {
  // Step 1: Edge Feathering
  edgeFeather: {
    enabled: true,
    radius: 1.5,        // Blur radius in pixels (1-3 recommended)
    iterations: 2,      // Number of blur passes for smoothness
  },

  // Step 2: Ground Shadow
  groundShadow: {
    enabled: true,
    offsetY: 0.02,      // Vertical offset as fraction of image height
    width: 0.6,         // Shadow width as fraction of character width
    height: 0.08,       // Shadow height as fraction of character width
    blur: 25,           // Blur radius for shadow softness
    opacity: 0.15,      // Shadow opacity (0.1-0.2 recommended)
    color: [30, 20, 15], // RGB base color (warm dark brown)
  },

  // Step 3: Color Harmonization
  colorHarmonize: {
    enabled: true,
    sampleY: 0.95,      // Y position to sample background (near feet)
    blendStrength: 0.07, // How much to tint toward background (0.05-0.10)
    affectShadows: true, // Apply stronger tint to darker areas
    shadowBoost: 1.5,    // Multiplier for shadow tinting
  },

  // Step 4: Contrast & Gamma
  contrastGamma: {
    enabled: true,
    contrast: 1.08,      // Contrast multiplier (1.05-1.15 recommended)
    gamma: 0.95,         // Gamma correction (<1 = richer mids, >1 = lighter)
    highlightReduce: 0.03, // Reduce blown highlights by this amount
    blackPoint: 5,       // Lift blacks slightly to avoid crushing
  },
};

// ============================================================================
// STEP 1: Edge Feathering
// ============================================================================
/**
 * Applies a soft alpha blur to the edges of the character image.
 * This removes the hard "cutout" look from AI-generated transparent PNGs.
 *
 * Why it improves invite feel:
 * - Removes jarring hard edges that look pasted-on
 * - Creates natural blending with any background
 * - Mimics the soft edges of hand-painted illustrations
 */
export function applyEdgeFeathering(ctx, width, height, config = POST_PROCESS_CONFIG.edgeFeather) {
  if (!config.enabled) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const { radius, iterations } = config;

  // Create alpha channel copy for edge detection
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  // Apply box blur to alpha channel only (fast approximation of gaussian)
  for (let iter = 0; iter < iterations; iter++) {
    const blurred = new Float32Array(alpha.length);
    const r = Math.ceil(radius);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const originalAlpha = alpha[idx];

        // Only process edge pixels (not fully opaque interior)
        if (originalAlpha > 0 && originalAlpha < 255) {
          let sum = 0;
          let count = 0;

          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                sum += alpha[ny * width + nx];
                count++;
              }
            }
          }

          blurred[idx] = sum / count;
        } else {
          blurred[idx] = originalAlpha;
        }
      }
    }

    // Copy blurred back to alpha
    for (let i = 0; i < alpha.length; i++) {
      alpha[i] = blurred[i];
    }
  }

  // Write back to image data
  for (let i = 0; i < alpha.length; i++) {
    data[i * 4 + 3] = Math.round(alpha[i]);
  }

  ctx.putImageData(imageData, 0, 0);
}

// ============================================================================
// STEP 2: Ground Shadow
// ============================================================================
/**
 * Generates a soft oval shadow beneath the characters' feet.
 *
 * Why it improves invite feel:
 * - Grounds the characters in the scene (not floating)
 * - Adds subtle depth and dimension
 * - Creates visual weight and presence
 * - Professional illustrations always have contact shadows
 */
export function applyGroundShadow(
  ctx,
  characterBounds,
  canvasWidth,
  canvasHeight,
  config = POST_PROCESS_CONFIG.groundShadow
) {
  if (!config.enabled) return;

  const { x, y, width, height } = characterBounds;
  const feetY = y + height; // Bottom of character

  // Calculate shadow dimensions
  const shadowWidth = width * config.width;
  const shadowHeight = width * config.height;
  const shadowX = x + (width - shadowWidth) / 2;
  const shadowY = feetY + (canvasHeight * config.offsetY);

  // Create shadow gradient (radial for oval shape)
  const centerX = shadowX + shadowWidth / 2;
  const centerY = shadowY + shadowHeight / 2;

  // Save current state
  ctx.save();

  // Create elliptical path for shadow
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    centerY,
    shadowWidth / 2 + config.blur,
    shadowHeight / 2 + config.blur,
    0,
    0,
    Math.PI * 2
  );

  // Create radial gradient for soft falloff
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(shadowWidth, shadowHeight) / 2
  );

  const [r, g, b] = config.color;
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${config.opacity})`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${config.opacity * 0.5})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = gradient;

  // Apply blur via shadow (efficient blur technique)
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${config.opacity})`;
  ctx.shadowBlur = config.blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.fill();
  ctx.restore();

  return { x: shadowX, y: shadowY, width: shadowWidth, height: shadowHeight };
}

// ============================================================================
// STEP 3: Color Harmonization
// ============================================================================
/**
 * Samples the background color and subtly tints the character's lower
 * portions and shadows toward that hue.
 *
 * Why it improves invite feel:
 * - Integrates character with background palette
 * - Removes "pasted on" appearance
 * - Creates color cohesion like professional illustrations
 * - Mimics ambient light bouncing from the ground
 */
export function applyColorHarmonization(
  ctx,
  width,
  height,
  backgroundCtx,
  bgWidth,
  bgHeight,
  characterBounds,
  config = POST_PROCESS_CONFIG.colorHarmonize
) {
  if (!config.enabled) return;

  // Sample background color near the character's feet
  const sampleY = Math.floor(bgHeight * config.sampleY);
  const sampleX = Math.floor(bgWidth / 2);

  let bgColor;
  try {
    const bgData = backgroundCtx.getImageData(sampleX - 10, sampleY - 10, 20, 20).data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (let i = 0; i < bgData.length; i += 4) {
      if (bgData[i + 3] > 128) { // Only sample opaque pixels
        rSum += bgData[i];
        gSum += bgData[i + 1];
        bSum += bgData[i + 2];
        count++;
      }
    }

    if (count > 0) {
      bgColor = {
        r: rSum / count,
        g: gSum / count,
        b: bSum / count,
      };
    } else {
      bgColor = { r: 255, g: 248, b: 220 }; // Fallback: cream
    }
  } catch {
    bgColor = { r: 255, g: 248, b: 220 }; // Fallback: cream
  }

  // Apply tint to character image
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const { blendStrength, affectShadows, shadowBoost } = config;
  const charBottom = characterBounds.y + characterBounds.height;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue; // Skip transparent pixels

    const pixelY = Math.floor((i / 4) / width);

    // Calculate blend factor based on vertical position (stronger near feet)
    const verticalFactor = Math.max(0, (pixelY - characterBounds.y) / characterBounds.height);
    let blend = blendStrength * verticalFactor;

    // Boost blending in shadow areas (darker pixels)
    if (affectShadows) {
      const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      if (luminance < 0.5) {
        blend *= 1 + (shadowBoost - 1) * (1 - luminance * 2);
      }
    }

    // Apply color blend
    data[i] = Math.round(data[i] * (1 - blend) + bgColor.r * blend);
    data[i + 1] = Math.round(data[i + 1] * (1 - blend) + bgColor.g * blend);
    data[i + 2] = Math.round(data[i + 2] * (1 - blend) + bgColor.b * blend);
  }

  ctx.putImageData(imageData, 0, 0);
}

// ============================================================================
// STEP 4: Contrast & Gamma Adjustment
// ============================================================================
/**
 * Enhances the tonal range of the character image for a richer,
 * more polished appearance.
 *
 * Why it improves invite feel:
 * - Increases visual punch without harshness
 * - Enriches mid-tones for depth
 * - Prevents washed-out appearance
 * - Adds professional print-ready quality
 */
export function applyContrastGamma(ctx, width, height, config = POST_PROCESS_CONFIG.contrastGamma) {
  if (!config.enabled) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const { contrast, gamma, highlightReduce, blackPoint } = config;

  // Pre-calculate gamma lookup table for performance
  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLUT[i] = Math.round(255 * Math.pow(i / 255, gamma));
  }

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    for (let c = 0; c < 3; c++) {
      let value = data[i + c];

      // Apply gamma correction (enriches mid-tones)
      value = gammaLUT[value];

      // Apply contrast around mid-point (128)
      value = Math.round(((value / 255 - 0.5) * contrast + 0.5) * 255);

      // Reduce highlights
      if (value > 240) {
        value = Math.round(value - (value - 240) * highlightReduce * 10);
      }

      // Lift blacks slightly
      if (value < blackPoint) {
        value = blackPoint;
      }

      // Clamp to valid range
      data[i + c] = Math.max(0, Math.min(255, value));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// ============================================================================
// MAIN PIPELINE FUNCTION
// ============================================================================
/**
 * Runs the complete post-processing pipeline on a character image.
 *
 * @param {HTMLCanvasElement} characterCanvas - Canvas with the character image
 * @param {HTMLCanvasElement} backgroundCanvas - Canvas with the background (for color sampling)
 * @param {Object} characterBounds - {x, y, width, height} of character placement
 * @param {Object} config - Optional configuration overrides
 * @returns {HTMLCanvasElement} - Processed canvas
 */
export function runPostProcessingPipeline(
  characterCanvas,
  backgroundCanvas,
  characterBounds,
  config = POST_PROCESS_CONFIG
) {
  const width = characterCanvas.width;
  const height = characterCanvas.height;

  // Create a working canvas
  const workCanvas = document.createElement("canvas");
  workCanvas.width = width;
  workCanvas.height = height;
  const workCtx = workCanvas.getContext("2d");

  // Copy character to working canvas
  workCtx.drawImage(characterCanvas, 0, 0);

  console.log("[PostProcess] Starting pipeline...");
  const startTime = performance.now();

  // Step 1: Edge Feathering
  if (config.edgeFeather?.enabled) {
    const t1 = performance.now();
    applyEdgeFeathering(workCtx, width, height, config.edgeFeather);
    console.log(`[PostProcess] Edge feathering: ${(performance.now() - t1).toFixed(1)}ms`);
  }

  // Step 2: Ground Shadow (drawn on a separate layer, composited later)
  // Note: Shadow is handled in the main composer since it goes BEHIND the character

  // Step 3: Color Harmonization
  if (config.colorHarmonize?.enabled && backgroundCanvas) {
    const t3 = performance.now();
    const bgCtx = backgroundCanvas.getContext("2d");
    applyColorHarmonization(
      workCtx,
      width,
      height,
      bgCtx,
      backgroundCanvas.width,
      backgroundCanvas.height,
      characterBounds,
      config.colorHarmonize
    );
    console.log(`[PostProcess] Color harmonization: ${(performance.now() - t3).toFixed(1)}ms`);
  }

  // Step 4: Contrast & Gamma
  if (config.contrastGamma?.enabled) {
    const t4 = performance.now();
    applyContrastGamma(workCtx, width, height, config.contrastGamma);
    console.log(`[PostProcess] Contrast & gamma: ${(performance.now() - t4).toFixed(1)}ms`);
  }

  console.log(`[PostProcess] Pipeline complete: ${(performance.now() - startTime).toFixed(1)}ms total`);

  return workCanvas;
}

// ============================================================================
// UTILITY: Create Shadow Layer
// ============================================================================
/**
 * Creates a separate canvas with just the ground shadow.
 * This should be composited BEHIND the character.
 */
export function createShadowLayer(canvasWidth, canvasHeight, characterBounds, config = POST_PROCESS_CONFIG.groundShadow) {
  if (!config.enabled) return null;

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = canvasWidth;
  shadowCanvas.height = canvasHeight;
  const shadowCtx = shadowCanvas.getContext("2d");

  applyGroundShadow(shadowCtx, characterBounds, canvasWidth, canvasHeight, config);

  return shadowCanvas;
}
