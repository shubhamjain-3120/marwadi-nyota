import { GoogleGenerativeAI } from "@google/generative-ai";

// Phase 4: 3 attempts max, rotating through flat vector prompt variants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

// ============================================================================
// FIXED POSE TEMPLATE (injected into all prompts)
// ============================================================================
const POSE_TEMPLATE = `
MANDATORY POSE (must follow exactly):
- Groom stands on the LEFT, bride on the RIGHT
- Both facing forward toward the viewer at a slight 3/4 angle
- Groom's right arm gently around bride's waist or lower back
- Bride's left hand resting on groom's chest or holding his hand
- Both standing upright with confident, relaxed posture
- Slight lean toward each other showing affection
- Full body visible from head to toe
- Feet firmly planted, slight gap between them
- Height difference preserved naturally from reference photos
`;

// ============================================================================
// PHASE 4: FLAT VECTOR STYLE ENFORCEMENT
// ============================================================================
const FLAT_VECTOR_STYLE = `
OUTPUT STYLE - FLAT VECTOR INDIAN WEDDING INVITATION ILLUSTRATION (CRITICAL):

THIS MUST BE A FLAT VECTOR ILLUSTRATION:
- Clean, crisp flat vector artwork
- Solid color fills only - NO gradients on skin or clothing
- Thin, consistent outlines (like a coloring book)
- Minimal shading - only simple shadows for basic form definition
- High contrast, saturated jewel-tone colors
- Decorative Indian wedding card aesthetic
- Folk art / traditional invitation card style
- Clean geometric shapes for clothing patterns

RENDERING RULES:
- Skin: single flat color per person, NO gradients
- Hair: solid color with simple shape definition
- Clothing: flat color fills with decorative pattern overlays
- Jewelry: solid gold/silver colors, simple shapes
- Outlines: thin, consistent weight throughout
- Shadows: minimal, flat (not gradient), only where essential

STYLIZATION:
- Faces should be simplified but recognizable
- Features slightly stylized for illustration appeal
- Proportions can be slightly idealized
- Overall look: premium wedding invitation artwork
`;

const FLAT_VECTOR_NEGATIVE = `
DO NOT USE - STRICTLY FORBIDDEN:
- NO gradients or gradient shading on skin
- NO 3D rendering or dimensional shading
- NO realistic or photorealistic elements
- NO painterly or brush stroke textures
- NO soft blended edges
- NO cel-shading with gradient shadows
- NO anime or manga style
- NO detailed skin textures or pores
- NO dramatic lighting or shadows
- NO semi-realistic rendering
- NO watercolor or artistic media effects
`;

const BACKGROUND_REQUIREMENT = `
BACKGROUND REQUIREMENT (CRITICAL):
- Generate the couple on a SOLID WHITE or LIGHT CREAM background
- The background must be PLAIN and UNIFORM
- NO patterns, textures, or decorations in background
- NO gradient backgrounds
- NO environmental elements
- This solid background will be removed in post-processing
- Ensure clean edges on the characters for easy background removal
`;

// ============================================================================
// ATTIRE TEMPLATE - FLAT VECTOR STYLE
// ============================================================================
const FLAT_VECTOR_ATTIRE = `
TRADITIONAL MARWADI WEDDING ATTIRE (flat vector style):

GROOM:
- Sherwani/achkan in solid deep maroon, royal gold, or rich cream
- Decorative embroidery patterns rendered as flat geometric designs
- Traditional pagdi (turban) with ornate kalgi brooch
- Patterns should be clean vector shapes, not textured
- Mojari shoes with curved tips
- All elements in solid, flat colors

BRIDE:
- Bridal lehenga in solid crimson red with gold accents
- Embroidery rendered as flat decorative patterns
- Dupatta draped elegantly over head
- Traditional Rajasthani jewelry as simple vector shapes:
  - Borla/maang tikka
  - Nath (nose ring)
  - Layered necklaces
  - Gold bangles
  - Jhumka earrings
- Mehndi as flat decorative pattern on hands
- All elements in solid, flat colors with clean outlines
`;

// ============================================================================
// PROMPT V1: Flat Vector Balanced
// ============================================================================
const createPromptV1 = (mode) => {
  const modeInstruction = mode === "couple"
    ? "Using the provided couple photo as reference for their appearance:"
    : "Using the TWO provided individual photos as reference - first photo is the GROOM, second photo is the BRIDE:";

  return `Create a FLAT VECTOR ILLUSTRATION of a wedding couple for a traditional Indian Marwadi wedding invitation card.

This should look like a high-quality wedding invitation illustration - clean, decorative, and elegant with flat colors and thin outlines.

${modeInstruction}

PRESERVE FROM REFERENCE PHOTOS:
- Skin tone (as a single flat color)
- Hair color and general style
- Facial hair if present on groom
- General face shape (simplified for vector style)
- Body type and proportions
- Relative height difference

${POSE_TEMPLATE}

${FLAT_VECTOR_STYLE}

${FLAT_VECTOR_ATTIRE}

EXPRESSION:
- Warm, welcoming smiles
- Happy, confident expressions
- Eyes conveying joy

${FLAT_VECTOR_NEGATIVE}

${BACKGROUND_REQUIREMENT}

OUTPUT: PNG image with the couple on a solid white/cream background, flat vector illustration style, full body, clean edges for background removal.`;
};

// ============================================================================
// PROMPT V2: Flat Vector - Stronger Style Enforcement
// ============================================================================
const createPromptV2 = (mode) => {
  const modeInstruction = mode === "couple"
    ? "Reference couple photo provided - extract their likeness:"
    : "Two reference photos provided - FIRST is groom, SECOND is bride - extract their individual likenesses:";

  return `Generate a DECORATIVE FLAT VECTOR WEDDING ILLUSTRATION in the style of premium Indian wedding invitation cards.

Think: The elegant flat illustrations on traditional Indian wedding cards - clean lines, solid colors, decorative patterns.

${modeInstruction}

CHARACTER LIKENESS:
- Match skin tone as a single flat color
- Capture hair color and basic style
- Include facial hair if groom has any
- Preserve body type
- Maintain height ratio

CRITICAL - THIS MUST BE FLAT VECTOR ART:
- ONLY solid color fills - absolutely NO gradients
- Thin, clean outlines on all elements
- Minimal shading - flat shadows only where needed
- High contrast, vibrant colors
- Decorative folk art aesthetic
- Clean geometric patterns for clothing details
- This is NOT 3D, NOT realistic, NOT painterly

${POSE_TEMPLATE}

${FLAT_VECTOR_ATTIRE}

MOOD:
- Joyful, celebratory
- Traditional elegance
- Warm, inviting smiles

AVOID AT ALL COSTS:
- Gradient shading on skin
- Realistic rendering
- 3D effects
- Soft shadows
- Painterly textures
- Photographic qualities

${BACKGROUND_REQUIREMENT}

OUTPUT FORMAT: PNG with solid light background, flat vector wedding illustration, full body, ready for background removal.`;
};

// ============================================================================
// PROMPT V3: Flat Vector Strict - Maximum Enforcement
// ============================================================================
const createPromptV3 = (mode) => {
  const modeInstruction = mode === "couple"
    ? "Couple reference photo attached - use for face/body reference only:"
    : "Two photos attached - Photo 1 = GROOM reference, Photo 2 = BRIDE reference:";

  return `You are creating a FLAT VECTOR ILLUSTRATION for an Indian wedding invitation. The output MUST be clean flat vector art, NOT realistic, NOT 3D, NOT painterly.

${modeInstruction}

EXTRACT FROM PHOTOS:
- Skin color: convert to a single flat color
- Hair: solid color, simplified shape
- Facial hair: include if present, flat color
- Body shape: preserve general proportions
- Height: maintain relative difference

MANDATORY FLAT VECTOR STYLE - READ CAREFULLY:

This MUST look like traditional Indian wedding card art:
- SOLID FLAT COLORS ONLY - no gradients anywhere
- THIN CONSISTENT OUTLINES - like a coloring book
- MINIMAL FLAT SHADOWS - only for basic form
- DECORATIVE PATTERNS - geometric, clean, vector
- STYLIZED FACES - simplified but recognizable
- FOLK ART AESTHETIC - not modern, not realistic

THIS IS NOT (REJECT IF OUTPUT LOOKS LIKE):
- 3D rendered (no dimensional shading)
- Realistic (no skin texture, no photo-like quality)
- Painterly (no brush strokes, no soft edges)
- Gradient shaded (no smooth color transitions)
- Cel-shaded anime (no that style)
- Semi-realistic (no compromise - fully flat vector)

EXACT POSE REQUIRED:
- Groom: LEFT side, facing 3/4 toward viewer
- Bride: RIGHT side, facing 3/4 toward viewer
- Groom's arm around bride's waist
- Standing close, slight lean toward each other
- FULL BODY from head to feet visible

${FLAT_VECTOR_ATTIRE}

EXPRESSIONS:
- Simple, warm smiles
- Happy eyes
- Dignified, celebratory

BACKGROUND:
- SOLID WHITE or LIGHT CREAM only
- NO patterns, NO gradients
- Plain uniform background for easy removal

FINAL OUTPUT: PNG, flat vector Indian wedding illustration, solid background, clean character edges, full body couple.`;
};

// ============================================================================
// PROMPT VARIANTS ARRAY
// ============================================================================
const PROMPT_VARIANTS = [
  { name: "v1-flat-balanced", create: createPromptV1 },
  { name: "v2-flat-strong", create: createPromptV2 },
  { name: "v3-flat-strict", create: createPromptV3 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================
export async function generateWeddingCharacters(photos, mode) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      responseModalities: ["image", "text"],
    },
  });

  // Prepare image parts
  const imageParts = photos.map((photo) => ({
    inlineData: {
      mimeType: photo.mimetype,
      data: photo.buffer.toString("base64"),
    },
  }));

  let lastResult = null;
  let lastError = null;
  const startTime = Date.now();

  console.log(`[Gemini] Starting Phase 4 flat vector generation - mode: ${mode}, photos: ${photos.length}`);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const promptVariant = PROMPT_VARIANTS[attempt];
    const prompt = promptVariant.create(mode);
    const attemptStart = Date.now();

    try {
      console.log(`[Gemini] Attempt ${attempt + 1}/${MAX_RETRIES} using prompt ${promptVariant.name}`);

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = result.response;

      // Extract image from response
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              const attemptDuration = Date.now() - attemptStart;
              const totalDuration = Date.now() - startTime;

              console.log(`[Gemini] SUCCESS on attempt ${attempt + 1}`);
              console.log(`[Gemini] Prompt variant: ${promptVariant.name}`);
              console.log(`[Gemini] Attempt duration: ${attemptDuration}ms`);
              console.log(`[Gemini] Total duration: ${totalDuration}ms`);

              return {
                success: true,
                imageData: part.inlineData.data,
                mimeType: part.inlineData.mimeType || "image/png",
                metadata: {
                  promptVariant: promptVariant.name,
                  attempt: attempt + 1,
                  attemptDurationMs: attemptDuration,
                  totalDurationMs: totalDuration,
                },
              };
            }
          }
        }
      }

      // No image in response - continue to next attempt
      console.log(`[Gemini] Attempt ${attempt + 1}: No image in response`);
      lastError = new Error("No image generated in response");

    } catch (error) {
      const attemptDuration = Date.now() - attemptStart;
      console.error(`[Gemini] Attempt ${attempt + 1} failed after ${attemptDuration}ms:`, error.message);
      lastError = error;
    }

    // Wait before next attempt (unless it's the last one)
    if (attempt < MAX_RETRIES - 1) {
      console.log(`[Gemini] Waiting ${RETRY_DELAY_MS}ms before next attempt...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  // All retries exhausted
  const totalDuration = Date.now() - startTime;
  console.error(`[Gemini] All ${MAX_RETRIES} attempts exhausted after ${totalDuration}ms`);

  if (lastResult) {
    console.log(`[Gemini] Returning last successful result`);
    return lastResult;
  }

  throw new Error(`Generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

// ============================================================================
// EXPORTS FOR TESTING/DEBUGGING
// ============================================================================
export const _internal = {
  PROMPT_VARIANTS,
  POSE_TEMPLATE,
  FLAT_VECTOR_STYLE,
  FLAT_VECTOR_NEGATIVE,
  BACKGROUND_REQUIREMENT,
  createPromptV1,
  createPromptV2,
  createPromptV3,
};
