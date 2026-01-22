/**
 * Video Composer - Compose character and text overlays on video background
 * 
 * Takes a 30-second background video and overlays:
 * - Character image at fixed position (same as static composer)
 * - Names, date, venue text with premium typography
 * 
 * Uses MediaRecorder API to record, then FFmpeg.wasm to convert to MP4
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// FFmpeg instance (lazy loaded)
let ffmpeg = null;
let ffmpegLoaded = false;

/**
 * Load FFmpeg.wasm (only loads once)
 */
async function loadFFmpeg(onProgress) {
  if (ffmpegLoaded && ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) {
      // Progress is 0-1, we want to report 90-100 during conversion
      const percent = 90 + Math.round(progress * 10);
      onProgress(Math.min(percent, 99));
    }
  });

  // Load FFmpeg with multi-threaded core for better performance
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  
  try {
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    ]);
    
    await ffmpeg.load({ coreURL, wasmURL });
    
    ffmpegLoaded = true;
    return ffmpeg;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert WebM blob to MP4 using FFmpeg.wasm
 */
async function convertWebMToMP4(webmBlob, onProgress) {
  const ffmpegInstance = await loadFFmpeg(onProgress);
  
  // Write input file
  await ffmpegInstance.writeFile("input.webm", await fetchFile(webmBlob));
  
  // Convert to MP4 with H.264 codec for maximum compatibility
  // Using -c:v libx264 for video, -c:a aac for audio
  // -movflags +faststart enables progressive download
  const ffmpegArgs = [
    "-i", "input.webm",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    "output.mp4"
  ];
  
  try {
    await ffmpegInstance.exec(ffmpegArgs);
  } catch (error) {
    throw error;
  }
  
  // Read output file
  const data = await ffmpegInstance.readFile("output.mp4");
  
  // Cleanup
  await ffmpegInstance.deleteFile("input.webm");
  await ffmpegInstance.deleteFile("output.mp4");
  
  const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
  
  return mp4Blob;
}

// Canvas dimensions for the invite (9:16 aspect ratio)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

// Layout specification (same as canvasComposer.js)
const LAYOUT_V4 = {
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },

  character: {
    heightPercent: 0.60,
    marginXPercent: 0.08,
    topPercent: 0.22,
    bottomPercent: 0.82,
    sizeMultiplier: 2.0,
  },

  shadow: {
    yPercent: 0.82,
    widthPercent: 0.45,
    heightPercent: 0.025,
    blur: 30,
    opacity: 0.12,
    color: "rgba(30, 20, 15, 0.12)",
  },

  names: {
    yPercent: 0.115,
    fontRatio: 2.405,
    maxWidthPercent: 0.88,
    letterSpacing: 0.02,
    fontFamily: "AlexBrush, 'Alex Brush', 'Great Vibes', cursive",
    fontWeight: "400",
  },

  ampersand: {
    scale: 0.35,
    yOffset: 0,
  },

  date: {
    yPercent: 0.875,
    fontRatio: 0.7,
    letterSpacing: 0.18,
    fontFamily: "PlayfairDisplay, 'Playfair Display', Georgia, serif",
    fontWeight: "400",
    color: "#8B7355",
  },

  venue: {
    yPercent: 0.915,
    fontRatio: 0.7,
    letterSpacing: 0.18,
    fontFamily: "PlayfairDisplay, 'Playfair Display', Georgia, serif",
    fontWeight: "400",
    color: "#8B7355",
  },

  baseFontSize: 54,
};

// Color palette (same as canvasComposer.js)
const COLORS = {
  goldPrimary: "#D4A853",
  goldHighlight: "#F8E8B0",
  goldDeep: "#A67C3D",
  goldMid: "#E6C066",
  goldRich: "#C9942B",
  goldBright: "#F0D78C",
  copperBrown: "#B87333",
  copperBrownLight: "#CD8544",
  copperBrownDark: "#8B5A2B",
};

// Animation timing for staggered fade-in (in seconds)
// Total animation sequence: 5 seconds
const ANIMATION = {
  names: { start: 0, end: 1.5 },      // 0-1.5s: Names fade in first
  date: { start: 1.5, end: 3.0 },     // 1.5-3s: Date fades in
  venue: { start: 3.0, end: 4.0 },    // 3-4s: Venue fades in
  character: { start: 4.0, end: 30.0 } // 4-5s: Character fades in last
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function loadVideo(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.preload = "auto";
    
    video.onloadeddata = () => resolve(video);
    video.onerror = (e) => {
      const error = new Error(`Failed to load video: ${e.message || 'Unknown error'}`);
      reject(error);
    };
    video.src = src;
    video.load();
  });
}

async function loadFonts() {
  const alexBrush = new FontFace("AlexBrush", "url(/fonts/AlexBrush-Regular.ttf)");
  const playfair = new FontFace("PlayfairDisplay", "url(/fonts/PlayfairDisplay-Regular.ttf)");
  const inter = new FontFace("Inter", "url(/fonts/Inter-Regular.ttf)");
  const interMedium = new FontFace("InterMedium", "url(/fonts/Inter-Medium.ttf)");

  try {
    const loadedFonts = await Promise.all([
      alexBrush.load(),
      playfair.load(),
      inter.load(),
      interMedium.load(),
    ]);
    
    loadedFonts.forEach(font => {
      if (font) document.fonts.add(font);
    });
  } catch {
    // Font loading failed, will use fallbacks
  }
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Calculate opacity for fade-in animation based on current time
 * @param {number} currentTime - Current video time in seconds
 * @param {number} startTime - When fade starts (opacity 0)
 * @param {number} endTime - When fade ends (opacity 1)
 * @returns {number} - Opacity value between 0 and 1
 */
function calculateOpacity(currentTime, startTime, endTime) {
  if (currentTime < startTime) return 0;
  if (currentTime >= endTime) return 1;
  return (currentTime - startTime) / (endTime - startTime);
}

// ============================================================================
// CHARACTER PLACEMENT
// ============================================================================

function calculateCharacterBounds(characterImg) {
  const targetTop = CANVAS_HEIGHT * LAYOUT_V4.character.topPercent;
  const targetBottom = CANVAS_HEIGHT * LAYOUT_V4.character.bottomPercent;
  const targetHeight = targetBottom - targetTop;

  const marginX = CANVAS_WIDTH * LAYOUT_V4.character.marginXPercent;
  const maxWidth = CANVAS_WIDTH - (marginX * 2);

  const charAspect = characterImg.width / characterImg.height;

  let charWidth, charHeight;

  charHeight = targetHeight;
  charWidth = charHeight * charAspect;

  if (charWidth > maxWidth) {
    charWidth = maxWidth;
    charHeight = charWidth / charAspect;
  }

  const multiplier = LAYOUT_V4.character.sizeMultiplier || 1.0;
  charWidth *= multiplier;
  charHeight *= multiplier;

  const charX = (CANVAS_WIDTH - charWidth) / 2;
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
// DRAWING FUNCTIONS
// ============================================================================

function drawGroundShadow(ctx, characterBounds) {
  const shadow = LAYOUT_V4.shadow;

  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT * shadow.yPercent;
  const radiusX = (CANVAS_WIDTH * shadow.widthPercent) / 2;
  const radiusY = (CANVAS_HEIGHT * shadow.heightPercent) / 2;

  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(radiusX, radiusY)
  );

  gradient.addColorStop(0, `rgba(30, 20, 15, ${shadow.opacity})`);
  gradient.addColorStop(0.6, `rgba(30, 20, 15, ${shadow.opacity * 0.4})`);
  gradient.addColorStop(1, "rgba(30, 20, 15, 0)");

  ctx.save();
  ctx.filter = `blur(${shadow.blur}px)`;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function createPremiumGoldGradient(ctx, x, y, width, height) {
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

function createCopperBrownGradient(ctx, x, y, width, height) {
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

function calculateFontSize(ctx, text, maxWidth, idealSize, minSize, fontFamily, letterSpacing = 0) {
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

function drawTextWithTracking(ctx, text, x, y, letterSpacing) {
  if (letterSpacing <= 0) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = text.split('');
  const fontSize = parseFloat(ctx.font);
  const spacing = fontSize * letterSpacing;
  
  let totalWidth = 0;
  chars.forEach(char => {
    totalWidth += ctx.measureText(char).width;
  });
  totalWidth += (chars.length - 1) * spacing;
  
  let currentX = x - totalWidth / 2;

  chars.forEach((char) => {
    const charWidth = ctx.measureText(char).width;
    ctx.fillText(char, currentX + charWidth / 2, y);
    currentX += charWidth + spacing;
  });
}

function drawNamesText(ctx, brideName, groomName, opacity = 1) {
  if (opacity <= 0) return;
  
  const layout = LAYOUT_V4.names;
  const y = CANVAS_HEIGHT * layout.yPercent;
  const maxWidth = CANVAS_WIDTH * layout.maxWidthPercent;
  const idealSize = LAYOUT_V4.baseFontSize * layout.fontRatio;
  const minSize = LAYOUT_V4.baseFontSize * 1.2;
  
  const IDEAL_COMBINED_LENGTH = 13;

  const brideNameFormatted = capitalizeFirst(brideName);
  const groomNameFormatted = capitalizeFirst(groomName);
  const ampersand = " & ";
  const fullText = `${brideNameFormatted}${ampersand}${groomNameFormatted}`;

  const combinedNameLength = brideNameFormatted.length + groomNameFormatted.length;
  let adjustedIdealSize = idealSize;
  
  if (combinedNameLength > IDEAL_COMBINED_LENGTH) {
    const scaleFactor = IDEAL_COMBINED_LENGTH / combinedNameLength;
    adjustedIdealSize = idealSize * scaleFactor;
    adjustedIdealSize = Math.max(adjustedIdealSize, minSize);
  }

  const fontSize = calculateFontSize(
    ctx,
    fullText,
    maxWidth,
    adjustedIdealSize,
    minSize,
    layout.fontFamily,
    layout.letterSpacing
  );

  // Save context and apply opacity
  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.font = `${layout.fontWeight} ${fontSize}px ${layout.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const brideWidth = ctx.measureText(brideNameFormatted).width;
  const ampersandWidth = ctx.measureText(ampersand).width;
  const groomWidth = ctx.measureText(groomNameFormatted).width;
  const totalTextWidth = brideWidth + ampersandWidth + groomWidth;
  
  let currentX = (CANVAS_WIDTH - totalTextWidth) / 2;
  
  // Draw bride's name in warm gold gradient
  const goldGradient = createPremiumGoldGradient(ctx, currentX + brideWidth / 2, y, brideWidth, fontSize * 1.5);
  
  ctx.shadowColor = "rgba(166, 124, 61, 0.35)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = goldGradient;
  ctx.fillText(brideNameFormatted, currentX, y);
  currentX += brideWidth;
  
  // Draw ampersand in copper
  const copperGradient = createCopperBrownGradient(ctx, currentX + ampersandWidth / 2, y, ampersandWidth, fontSize * 1.5);
  
  ctx.shadowColor = "rgba(139, 90, 43, 0.35)";
  ctx.fillStyle = copperGradient;
  ctx.fillText(ampersand, currentX, y);
  currentX += ampersandWidth;
  
  // Draw groom's name in warm gold gradient
  const goldGradient2 = createPremiumGoldGradient(ctx, currentX + groomWidth / 2, y, groomWidth, fontSize * 1.5);
  
  ctx.shadowColor = "rgba(166, 124, 61, 0.35)";
  ctx.fillStyle = goldGradient2;
  ctx.fillText(groomNameFormatted, currentX, y);
  
  // Restore context (resets globalAlpha and shadow)
  ctx.restore();
}

function formatDateDisplay(dateStr) {
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

function drawDateText(ctx, dateStr, opacity = 1) {
  if (opacity <= 0) return;
  
  const layout = LAYOUT_V4.date;
  const y = CANVAS_HEIGHT * layout.yPercent;
  const fontSize = LAYOUT_V4.baseFontSize * layout.fontRatio;

  const formattedDate = formatDateDisplay(dateStr);
  const displayText = `Date: ${formattedDate}`;

  // Save context and apply opacity
  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.font = `${layout.fontWeight} ${fontSize}px ${layout.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = "rgba(139, 115, 85, 0.2)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = layout.color;
  
  drawTextWithTracking(ctx, displayText, CANVAS_WIDTH / 2, y, layout.letterSpacing);

  // Restore context (resets globalAlpha and shadow)
  ctx.restore();
}

function drawVenueText(ctx, venue, opacity = 1) {
  if (opacity <= 0) return;
  
  const layout = LAYOUT_V4.venue;
  const y = CANVAS_HEIGHT * layout.yPercent;
  const fontSize = LAYOUT_V4.baseFontSize * layout.fontRatio;

  const displayText = `Venue: ${venue}`;

  // Save context and apply opacity
  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.font = `${layout.fontWeight} ${fontSize}px ${layout.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = "rgba(139, 115, 85, 0.2)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = layout.color;
  
  drawTextWithTracking(ctx, displayText, CANVAS_WIDTH / 2, y, layout.letterSpacing);

  // Restore context (resets globalAlpha and shadow)
  ctx.restore();
}

// ============================================================================
// FRAME RENDERING
// ============================================================================

/**
 * Draw a single frame with video background, character, and text overlays
 * Elements fade in based on currentTime using ANIMATION timings
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} video
 * @param {HTMLImageElement} characterImg
 * @param {Object} characterBounds
 * @param {string} brideName
 * @param {string} groomName
 * @param {string} date
 * @param {string} venue
 * @param {number} currentTime - Current video time in seconds for animation timing
 */
function drawFrame(ctx, video, characterImg, characterBounds, brideName, groomName, date, venue, currentTime) {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Layer 1: Video background (scaled to fit canvas) - always visible
  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (videoAspect > canvasAspect) {
    // Video is wider - fit to height, crop sides
    drawHeight = CANVAS_HEIGHT;
    drawWidth = drawHeight * videoAspect;
    drawX = (CANVAS_WIDTH - drawWidth) / 2;
    drawY = 0;
  } else {
    // Video is taller - fit to width, crop top/bottom
    drawWidth = CANVAS_WIDTH;
    drawHeight = drawWidth / videoAspect;
    drawX = 0;
    drawY = (CANVAS_HEIGHT - drawHeight) / 2;
  }
  
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
  
  // Calculate opacity for each element based on animation timing
  const namesOpacity = calculateOpacity(currentTime, ANIMATION.names.start, ANIMATION.names.end);
  const dateOpacity = calculateOpacity(currentTime, ANIMATION.date.start, ANIMATION.date.end);
  const venueOpacity = calculateOpacity(currentTime, ANIMATION.venue.start, ANIMATION.venue.end);
  const characterOpacity = calculateOpacity(currentTime, ANIMATION.character.start, ANIMATION.character.end);
  
  // Layer 2: Ground shadow (fades in with character)
  if (characterOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = characterOpacity;
    drawGroundShadow(ctx, characterBounds);
    ctx.restore();
  }
  
  // Layer 3: Character (fades in last, after 4-5s)
  if (characterOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = characterOpacity;
    ctx.drawImage(
      characterImg,
      characterBounds.x,
      characterBounds.y,
      characterBounds.width,
      characterBounds.height
    );
    ctx.restore();
  }
  
  // Layer 4: Text overlays (fade in sequentially: names -> date -> venue)
  drawNamesText(ctx, brideName, groomName, namesOpacity);
  drawDateText(ctx, date, dateOpacity);
  drawVenueText(ctx, venue, venueOpacity);
}

// ============================================================================
// MAIN VIDEO COMPOSITION FUNCTION
// ============================================================================

/**
 * Compose a video invite with character and text overlays
 * 
 * @param {Object} params
 * @param {string} params.characterImage - Data URL of character (with transparent bg)
 * @param {string} params.brideName
 * @param {string} params.groomName
 * @param {string} params.date
 * @param {string} params.venue
 * @param {function} params.onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>} - Video blob (MP4 format)
 */
export async function composeVideoInvite({ 
  characterImage, 
  brideName, 
  groomName, 
  date, 
  venue,
  onProgress = () => {}
}) {
  onProgress(5);
  
  try {
    // Step 1: Load fonts
    await loadFonts();
    onProgress(10);
    
    // Step 2: Load assets in parallel
    const [video, characterImg] = await Promise.all([
      loadVideo("/assets/background.mp4"),
      loadImage(characterImage),
    ]);
    onProgress(20);
    
    // Step 3: Calculate character bounds
    const characterBounds = calculateCharacterBounds(characterImg);
    
    // Step 4: Setup canvas and media recording
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    
    // Setup MediaRecorder for video capture
    const targetFPS = 30;
    const canvasStream = canvas.captureStream(targetFPS);
    
    // Create audio context to capture audio from the source video
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    // Combine canvas video stream with audio stream
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks()
    ]);
    
    // Detect best supported codec
    const codecOptions = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
    ];
    let mimeType = 'video/webm;codecs=vp8,opus';
    for (const codec of codecOptions) {
      if (MediaRecorder.isTypeSupported(codec)) {
        mimeType = codec;
        break;
      }
    }
    
    const videoBitrate = 8000000; // 8 Mbps
    const audioBitrate = 128000;  // 128 kbps
    
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: audioBitrate,
    });
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    // Create promise for recording completion
    const recordingComplete = new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
    });
    
    // Step 5: Start recording and playback
    mediaRecorder.start(1000); // Request data every 1 second
    
    // Play video and render frames
    video.currentTime = 0;
    await new Promise((resolve) => {
      video.onseeked = resolve;
    });
    
    // Step 6: Render frames
    const videoDuration = video.duration;
    let lastProgressUpdate = 20;
    
    await new Promise((resolve) => {
      const renderLoop = () => {
        if (video.ended || video.currentTime >= videoDuration) {
          resolve();
          return;
        }
        
        // Draw current frame with animation timing based on video.currentTime
        drawFrame(ctx, video, characterImg, characterBounds, brideName, groomName, date, venue, video.currentTime);
        
        // Update progress (20% to 85% during rendering)
        const renderProgress = 20 + (video.currentTime / videoDuration) * 65;
        if (renderProgress - lastProgressUpdate >= 2) {
          onProgress(Math.round(renderProgress));
          lastProgressUpdate = renderProgress;
        }
        
        requestAnimationFrame(renderLoop);
      };
      
      video.onended = resolve;
      video.play();
      renderLoop();
    });
    
    onProgress(85);
    
    // Step 7: Finalize recording
    mediaRecorder.stop();
    
    const webmBlob = await recordingComplete;
    
    // Cleanup audio context
    await audioContext.close();
    
    // Step 8: Convert to MP4
    const mp4Blob = await convertWebMToMP4(webmBlob, onProgress);
    
    onProgress(100);
    
    return mp4Blob;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Convert video blob to data URL for preview
 */
export function videoBlobToDataURL(blob) {
  return URL.createObjectURL(blob);
}

export { LAYOUT_V4 };
