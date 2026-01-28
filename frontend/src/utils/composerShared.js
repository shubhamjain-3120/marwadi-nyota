/**
 * Shared utilities for canvas and video composers
 * Contains truly identical code used by both composition paths
 */

// Shared color palette (warm metallic gold and copper)
export const SHARED_COLORS = {
  // Warm metallic gold palette
  goldPrimary: "#D4A853",       // Rich warm gold base
  goldHighlight: "#F8E8B0",     // Warm champagne highlight
  goldDeep: "#A67C3D",          // Deep amber shadow tone
  goldMid: "#E6C066",           // Warm mid-tone gold
  goldRich: "#C9942B",          // Rich saturated gold
  goldBright: "#F0D78C",        // Bright warm gold for highlights

  // Copper for ampersand
  copperBrown: "#B87333",       // Rich copper base
  copperBrownLight: "#CD8544",  // Lighter copper highlight
  copperBrownDark: "#8B5A2B",   // Dark copper shadow
};

/**
 * Capitalize first letter of string, lowercase the rest
 */
export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format date string to "DD Month YYYY" display format
 */
export function formatDateDisplay(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Create warm metallic gold gradient with foil-like appearance
 */
export function createPremiumGoldGradient(ctx, x, y, width, height, COLORS) {
  const gradient = ctx.createLinearGradient(
    x - width / 2,
    y - height * 0.3,
    x + width / 2,
    y + height * 0.3
  );

  gradient.addColorStop(0, COLORS.goldRich);
  gradient.addColorStop(0.15, COLORS.goldPrimary);
  gradient.addColorStop(0.35, COLORS.goldMid);
  gradient.addColorStop(0.5, COLORS.goldBright);
  gradient.addColorStop(0.65, COLORS.goldMid);
  gradient.addColorStop(0.85, COLORS.goldPrimary);
  gradient.addColorStop(1, COLORS.goldRich);

  return gradient;
}

/**
 * Create copper brown gradient for ampersand
 */
export function createCopperBrownGradient(ctx, x, y, width, height, COLORS) {
  const gradient = ctx.createLinearGradient(
    x - width / 2,
    y - height * 0.3,
    x + width / 2,
    y + height * 0.3
  );

  gradient.addColorStop(0, COLORS.copperBrownDark);
  gradient.addColorStop(0.2, COLORS.copperBrown);
  gradient.addColorStop(0.4, COLORS.copperBrownLight);
  gradient.addColorStop(0.6, COLORS.copperBrownLight);
  gradient.addColorStop(0.8, COLORS.copperBrown);
  gradient.addColorStop(1, COLORS.copperBrownDark);

  return gradient;
}

/**
 * Calculate optimal font size to fit text within maxWidth
 */
export function calculateFontSize(ctx, text, maxWidth, idealSize, minSize, fontFamily, letterSpacing = 0) {
  let fontSize = idealSize;

  while (fontSize > minSize) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const spacingWidth = (text.length - 1) * (fontSize * letterSpacing);
    const totalWidth = metrics.width + spacingWidth;

    if (totalWidth <= maxWidth) {
      return fontSize;
    }
    fontSize -= 2;
  }

  return minSize;
}

/**
 * Draw text character-by-character with custom letter spacing
 */
export function drawTextWithTracking(ctx, text, x, y, letterSpacing) {
  if (letterSpacing <= 0) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = text.split('');
  const fontSize = parseFloat(ctx.font);
  const spacing = fontSize * letterSpacing;

  // Calculate total width for centering
  let totalWidth = 0;
  chars.forEach(char => {
    totalWidth += ctx.measureText(char).width;
  });
  totalWidth += (chars.length - 1) * spacing;

  // Start position (centered)
  let currentX = x - totalWidth / 2;

  chars.forEach((char) => {
    const charWidth = ctx.measureText(char).width;
    ctx.fillText(char, currentX + charWidth / 2, y);
    currentX += charWidth + spacing;
  });
}
