/**
 * Phase 4: Canvas Composer with Fixed Layout Geometry
 *
 * Key changes from Phase 3:
 * - Hard-coded percent-based layout (no heuristics)
 * - Text hierarchy: Names = 1.4N, Details = 0.7N
 * - Simplified post-processing for flat vector style
 * - Soft base shadow under feet
 */

// Canvas dimensions for the invite (9:16 aspect ratio)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

// ============================================================================
// PHASE 4: FIXED LAYOUT SPECIFICATION (Percent-Based)
// ============================================================================
const LAYOUT_V4 = {
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },

  // Character occupies 60% of vertical height
  character: {
    heightPercent: 0.60,
    marginXPercent: 0.08,     // 8% margin on each side
    topPercent: 0.22,         // Heads start at 22% from top (under arch)
    bottomPercent: 0.82,      // Feet end at 82% from top
  },

  // Ground shadow ellipse
  shadow: {
    yPercent: 0.82,           // Just below feet
    widthPercent: 0.45,       // 45% of canvas width
    heightPercent: 0.025,     // Thin ellipse
    blur: 30,
    opacity: 0.12,
    color: "rgba(30, 20, 15, 0.12)",
  },

  // Names text (top area)
  names: {
    yPercent: 0.145,          // 14.5% from top
    fontRatio: 1.4,           // 1.4 × base size
    maxWidthPercent: 0.85,
  },

  // Date text
  date: {
    yPercent: 0.86,           // 86% from top
    fontRatio: 0.7,           // 0.7 × base size
  },

  // Venue text
  venue: {
    yPercent: 0.90,           // 90% from top
    fontRatio: 0.7,           // 0.7 × base size
  },

  // Base font size (N)
  baseFontSize: 48,
};

// Colors
const COLORS = {
  goldGradientStart: "#FFD700",
  goldGradientMid: "#FFF8DC",
  goldGradientEnd: "#B8860B",
  detailsText: "#4A3728",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadFonts() {
  const greatVibes = new FontFace(
    "GreatVibes",
    "url(/fonts/GreatVibes-Regular.ttf)"
  );
  const playfair = new FontFace(
    "PlayfairDisplay",
    "url(/fonts/PlayfairDisplay-Regular.ttf)"
  );

  try {
    await Promise.all([greatVibes.load(), playfair.load()]);
    document.fonts.add(greatVibes);
    document.fonts.add(playfair);
  } catch (err) {
    console.warn("[Composer] Font loading failed, using fallbacks:", err);
  }
}

// ============================================================================
// TEXT RENDERING WITH HIERARCHY
// ============================================================================

/**
 * Calculate font size to fit text within max width
 * Uses the 1.4N ratio for names and auto-shrinks if needed
 */
function calculateFontSize(ctx, text, maxWidth, idealSize, minSize, fontFamily) {
  let fontSize = idealSize;

  while (fontSize > minSize) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return fontSize;
    }
    fontSize -= 2;
  }

  return minSize;
}

/**
 * Draw names with golden gradient (1.4N ratio)
 */
function drawNamesText(ctx, text) {
  const y = CANVAS_HEIGHT * LAYOUT_V4.names.yPercent;
  const maxWidth = CANVAS_WIDTH * LAYOUT_V4.names.maxWidthPercent;
  const idealSize = LAYOUT_V4.baseFontSize * LAYOUT_V4.names.fontRatio;
  const minSize = LAYOUT_V4.baseFontSize * 0.8;

  const fontSize = calculateFontSize(
    ctx,
    text,
    maxWidth,
    idealSize,
    minSize,
    "GreatVibes, cursive"
  );

  ctx.font = `${fontSize}px GreatVibes, cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Golden gradient
  const gradient = ctx.createLinearGradient(
    CANVAS_WIDTH / 2 - 250,
    y - fontSize / 2,
    CANVAS_WIDTH / 2 + 250,
    y + fontSize / 2
  );
  gradient.addColorStop(0, COLORS.goldGradientStart);
  gradient.addColorStop(0.5, COLORS.goldGradientMid);
  gradient.addColorStop(1, COLORS.goldGradientEnd);

  // Shadow for depth
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = gradient;
  ctx.fillText(text, CANVAS_WIDTH / 2, y);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draw date text (0.7N ratio)
 */
function drawDateText(ctx, text) {
  const y = CANVAS_HEIGHT * LAYOUT_V4.date.yPercent;
  const fontSize = LAYOUT_V4.baseFontSize * LAYOUT_V4.date.fontRatio;

  ctx.font = `${fontSize}px PlayfairDisplay, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.detailsText;
  ctx.fillText(text, CANVAS_WIDTH / 2, y);
}

/**
 * Draw venue text (0.7N ratio)
 */
function drawVenueText(ctx, text) {
  const y = CANVAS_HEIGHT * LAYOUT_V4.venue.yPercent;
  const fontSize = LAYOUT_V4.baseFontSize * LAYOUT_V4.venue.fontRatio;

  ctx.font = `${fontSize}px PlayfairDisplay, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.detailsText;
  ctx.fillText(text, CANVAS_WIDTH / 2, y);
}

// ============================================================================
// CHARACTER PLACEMENT (Fixed Geometry)
// ============================================================================

/**
 * Calculate character bounds using fixed layout percentages
 */
function calculateCharacterBounds(characterImg) {
  // Target area based on fixed percentages
  const targetTop = CANVAS_HEIGHT * LAYOUT_V4.character.topPercent;
  const targetBottom = CANVAS_HEIGHT * LAYOUT_V4.character.bottomPercent;
  const targetHeight = targetBottom - targetTop;

  const marginX = CANVAS_WIDTH * LAYOUT_V4.character.marginXPercent;
  const maxWidth = CANVAS_WIDTH - (marginX * 2);

  // Calculate dimensions preserving aspect ratio
  const charAspect = characterImg.width / characterImg.height;

  let charWidth, charHeight;

  // Fit to height first, then check width
  charHeight = targetHeight;
  charWidth = charHeight * charAspect;

  // If too wide, fit to width instead
  if (charWidth > maxWidth) {
    charWidth = maxWidth;
    charHeight = charWidth / charAspect;
  }

  // Center horizontally
  const charX = (CANVAS_WIDTH - charWidth) / 2;

  // Align feet to bottom of target area
  const charY = targetBottom - charHeight;

  return {
    x: charX,
    y: charY,
    width: charWidth,
    height: charHeight,
    feetY: targetBottom,
  };
}

// ============================================================================
// GROUND SHADOW
// ============================================================================

/**
 * Draw soft elliptical shadow under character's feet
 */
function drawGroundShadow(ctx, characterBounds) {
  const shadow = LAYOUT_V4.shadow;

  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT * shadow.yPercent;
  const radiusX = (CANVAS_WIDTH * shadow.widthPercent) / 2;
  const radiusY = (CANVAS_HEIGHT * shadow.heightPercent) / 2;

  // Create radial gradient for soft falloff
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(radiusX, radiusY)
  );

  gradient.addColorStop(0, `rgba(30, 20, 15, ${shadow.opacity})`);
  gradient.addColorStop(0.6, `rgba(30, 20, 15, ${shadow.opacity * 0.4})`);
  gradient.addColorStop(1, "rgba(30, 20, 15, 0)");

  ctx.save();

  // Draw blurred ellipse
  ctx.filter = `blur(${shadow.blur}px)`;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ============================================================================
// BACKGROUND CANVAS
// ============================================================================

function createBackgroundCanvas(backgroundImg) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (backgroundImg) {
    ctx.drawImage(backgroundImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    // Fallback: cream/gold gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, "#FFF8DC");
    bgGradient.addColorStop(0.5, "#FFE4B5");
    bgGradient.addColorStop(1, "#DEB887");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Decorative border
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 20;
    ctx.strokeRect(30, 30, CANVAS_WIDTH - 60, CANVAS_HEIGHT - 60);
  }

  return canvas;
}

// ============================================================================
// MAIN COMPOSITION FUNCTION
// ============================================================================

/**
 * Compose the final wedding invite
 *
 * @param {Object} params
 * @param {string} params.characterImage - Data URL of character (with transparent bg)
 * @param {string} params.brideName
 * @param {string} params.groomName
 * @param {string} params.date
 * @param {string} params.venue
 * @returns {Promise<string>} - Data URL of final PNG
 */
export async function composeInvite({ characterImage, brideName, groomName, date, venue }) {
  console.log("[Composer] Starting Phase 4 composition...");
  const startTime = performance.now();

  // Load fonts
  await loadFonts();

  // Load images in parallel
  const [backgroundImg, characterImg] = await Promise.all([
    loadImage("/assets/background.png").catch(() => null),
    loadImage(characterImage),
  ]);

  console.log(`[Composer] Images loaded: ${(performance.now() - startTime).toFixed(0)}ms`);

  // Calculate character placement using fixed layout
  const characterBounds = calculateCharacterBounds(characterImg);

  console.log(`[Composer] Character bounds:`, characterBounds);

  // Create final canvas
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  // =========================================================================
  // LAYER 1: Background
  // =========================================================================
  const backgroundCanvas = createBackgroundCanvas(backgroundImg);
  ctx.drawImage(backgroundCanvas, 0, 0);

  // =========================================================================
  // LAYER 2: Ground Shadow
  // =========================================================================
  drawGroundShadow(ctx, characterBounds);

  // =========================================================================
  // LAYER 3: Character
  // =========================================================================
  ctx.drawImage(
    characterImg,
    characterBounds.x,
    characterBounds.y,
    characterBounds.width,
    characterBounds.height
  );

  // =========================================================================
  // LAYER 4: Text Overlays
  // =========================================================================

  // Names (1.4N, GreatVibes, gold gradient)
  const namesText = `${groomName} & ${brideName}`;
  drawNamesText(ctx, namesText);

  // Date (0.7N, Playfair, brown)
  drawDateText(ctx, date);

  // Venue (0.7N, Playfair, brown)
  drawVenueText(ctx, venue);

  const totalTime = performance.now() - startTime;
  console.log(`[Composer] Composition complete: ${totalTime.toFixed(0)}ms`);

  // Export as PNG
  return canvas.toDataURL("image/png", 1.0);
}

// Export layout config for debugging
export { LAYOUT_V4 };
