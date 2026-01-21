import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// Initialize OpenAI for photo analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini for image generation
// Note: Imagen 3 requires Vertex AI access with proper project/location configuration
const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
const genAI = useVertexAI
  ? new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    })
  : new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

/**
 * Analyze a couple photo using ChatGPT (GPT-4 Vision) to extract detailed descriptions
 */
async function analyzePhoto(photo) {
  const analysisPrompt = `You are an expert visual analyst extracting structured human appearance attributes from a single photo of a couple (bride and groom).
Your goal is to infer the most likely visible physical attributes based strictly on what is observable in the image.

### Rules

* Do NOT return "unknown", "not visible", or null.
* Always prefer visual evidence over cultural assumptions.
* Use natural human categories, not numeric RGB or overly technical values.
* If face/body is partially occluded, infer from visible proportions, posture, and context.
* Output must be valid JSON only.

---

### Extract the following attributes

For **Bride**:

* height
* skin_color
* hairstyle
* eye_color
* body_shape
* face_shape
* spectacles

For **Groom**:

* height
* skin_color
* hairstyle
* eye_color
* body_shape
* facial_hair_style
* face_shape
* spectacles

---

### Attribute Guidelines

#### Height (relative, visual)

Choose from:

* very short
* short
* average
* tall
* very tall
  Base this on body proportions and comparison between bride and groom.

#### Skin color

Choose natural visible tones:

* very fair
* fair
* light wheatish
* wheatish
* medium brown
* tan
* dark brown
  Use lighting-aware judgment (e.g. "appears tan under warm lighting").

#### Hairstyle

Describe clearly and visually
Based strictly on what is visible.


#### Eye color

Choose visible category:

* dark brown
* brown
* hazel
* green
* blue
* grey
  If lighting affects perception, mention that.

#### Body shape

Choose from:

* slim
* athletic
* average
* curvy
* stocky
* broad
  Use clothing silhouette + posture to infer.

#### Face shape

Choose from:

* oval
* round
* square
* heart
* diamond
* oblong
  Judge using jawline, cheekbones, and forehead width.

#### Facial hair style (groom)

Describe clearly and visually
Based strictly on what is visible.

#### Spectacles

Choose from:

* none
* rectangular frames
* round frames
* oval frames
* cat-eye frames
* aviator frames
* rimless
* half-rim
  If wearing glasses, also note the frame color (e.g. "round frames, gold metal" or "rectangular frames, black plastic").

---

### Output Format (JSON only)

{
  "bride": {
    "height": {
      "primary": "",
    },
    "skin_color": {
      "primary": "",
    },
    "hairstyle": {
      "primary": "",
    },
    "eye_color": {
      "primary": "",
    },
    "body_shape": {
      "primary": "",
    },
    "face_shape": {
      "primary": "",
    },
    "spectacles": {
      "primary": "",
    }
  },
  "groom": {
    "height": {
      "primary": "",
    },
    "skin_color": {
      "primary": "",
    },
    "hairstyle": {
      "primary": "",
    },
    "eye_color": {
      "primary": "",
    },
    "body_shape": {
      "primary": "",
    },
    "facial_hair_style": {
      "primary": "",
    },
    "face_shape": {
      "primary": "",
    },
    "spectacles": {
      "primary": "",
    }
  }
}

`;

  // Build image content for GPT-4 Vision
  const imageContent = [{
    type: "image_url",
    image_url: {
      url: `data:${photo.mimetype};base64,${photo.buffer.toString("base64")}`,
    },
  }];

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:analyzePhoto:pre-openai',message:'About to call OpenAI',data:{photoMimetype:photo?.mimetype,photoBufferLen:photo?.buffer?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 1000,
    });
  } catch (apiError) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:analyzePhotos:openai-error',message:'OpenAI API call failed',data:{errorName:apiError.name,errorMessage:apiError.message,errorStatus:apiError.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw apiError;
  }

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:analyzePhotos:post-openai',message:'OpenAI response received',data:{hasChoices:!!response.choices,choicesLen:response.choices?.length,hasMessage:!!response.choices?.[0]?.message,finishReason:response.choices?.[0]?.finish_reason},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  const responseText = response.choices[0]?.message?.content;
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:analyzePhotos:responseText',message:'Extracted responseText',data:{responseTextType:typeof responseText,responseTextLen:responseText?.length,responseTextPreview:responseText?.slice(0,500),responseTextFull:responseText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (!responseText) {
    throw new Error("ChatGPT did not return a response");
  }

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:analyzePhotos:regex-result',message:'Regex match result',data:{jsonMatchFound:!!jsonMatch,jsonMatchLen:jsonMatch?.[0]?.length,jsonMatchPreview:jsonMatch?.[0]?.slice(0,300)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!jsonMatch) {
    // Check if this is a content policy refusal
    if (responseText.toLowerCase().includes("sorry") || responseText.toLowerCase().includes("can't") || responseText.toLowerCase().includes("cannot")) {
      throw new Error("The AI could not analyze the photos. Please try with different photos or ensure faces are clearly visible.");
    }
    throw new Error("Failed to parse photo analysis");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Evaluate a generated wedding image using GPT-4 Vision against the quality framework
 * Returns { passed: boolean, score: number, hardRulesFailed: string[], details: object }
 */
async function evaluateGeneratedImage(imageBase64, mimeType) {
  const evaluationPrompt = `You are an expert image quality evaluator for wedding invitation illustrations.
Evaluate the provided image against this strict framework and return a structured JSON response.

## 1. HARD GATING RULES (Fail if ANY violated)
These are non-negotiable. Any violation → automatic rejection.

### 1.1 Composition & Background
- Exactly two characters only
- Background is pure white, no gradients, textures, shadows, or scenery
- No props, furniture, decorations, animals, or additional people
- No text, logos, watermarks, or UI artifacts
- Both characters are fully visible head-to-toe (no cropping)

### 1.2 Pose & Camera
- Both characters standing side-by-side
- Holding hands
- Both facing directly forward (no 3/4 or side profiles)
- No dynamic angles, no tilted camera
- No sitting, walking, dancing, or asymmetry in posture

### 1.3 Attire Lock (All must match exactly, minor embroidery variation allowed)
Groom must have:
- Knee-length structured sherwani (light beige/cream)
- Subtle golden floral pattern
- Teal peacock embroidery on left chest and lower hem
- Deep magenta/maroon velvet dupatta with gold border and peacock motifs over right shoulder
- White churidar bottoms
- Golden tan mojaris/juttis

Bride must have:
- Lehenga choli in blush/pastel pink
- A-line voluminous lehenga with floral + mandala embroidery in rose pink, teal, gold
- Matching blouse with delicate floral threadwork
- Light pink sheer dupatta with gold-embroidered border
- Gold jewelry: layered necklace, oversized jhumkas, pearl maang tikka

## 2. ATTRIBUTE FIDELITY (35 points max)
Score each from 0-5 (5=clearly matches, 3=minor drift, 0=incorrect/missing)

Bride (17.5 pts): height, skin_color, hairstyle, eye_color, body_shape, face_shape, spectacles
Groom (17.5 pts): height, skin_color, hairstyle, eye_color, body_shape, facial_hair, face_shape, spectacles

## 3. POSE, EXPRESSION & EMOTIONAL ACCURACY (15 points max)
- Pose Accuracy (5): Side-by-side stance, natural hand-holding, symmetry
- Expression (5): Both joyful and warm, not neutral/bored/exaggerated
- Cultural Appropriateness (5): Indian wedding appropriate, no Western clichés

## 4. STYLE COMPLIANCE: GHIBLI-INSPIRED (20 points max)
- Visual Language (10): Soft painterly shading, gentle outlines, warm light, rounded features, expressive natural eyes
- Stylization Control (10): Realistic proportions with slight stylization, no chibi, no caricature, no hyper-real textures

## 5. RENDERING & VISUAL QUALITY (15 points max)
- Technical Cleanliness (5): No glitches, warped limbs, broken hands, mismatched lighting
- Edge & Detail Quality (5): Clean silhouettes, legible embroidery, coherent jewelry
- Color Discipline (5): No bleeding, no neon/over-saturated, harmony in pink/teal/gold/beige/maroon

## 6. COMPOSITION & BALANCE (10 points max)
- Bride and groom visually balanced in height and scale
- Neither dominates the frame
- Centered composition
- White space even and intentional
- No crowding at edges

## OUTPUT FORMAT (JSON only)
{
  "hard_rules": {
    "passed": true/false,
    "violations": ["list of specific violations if any"]
  },
  "scores": {
    "attribute_fidelity": {
      "bride": {"height": 0-5, "skin_color": 0-5, "hairstyle": 0-5, "eye_color": 0-5, "body_shape": 0-5, "face_shape": 0-5, "spectacles": 0-5},
      "groom": {"height": 0-5, "skin_color": 0-5, "hairstyle": 0-5, "eye_color": 0-5, "body_shape": 0-5, "facial_hair": 0-5, "face_shape": 0-5, "spectacles": 0-5},
      "total": 0-35
    },
    "pose_expression": {
      "pose_accuracy": 0-5,
      "expression": 0-5,
      "cultural_appropriateness": 0-5,
      "total": 0-15
    },
    "style_compliance": {
      "visual_language": 0-10,
      "stylization_control": 0-10,
      "total": 0-20
    },
    "rendering_quality": {
      "technical_cleanliness": 0-5,
      "edge_detail": 0-5,
      "color_discipline": 0-5,
      "total": 0-15
    },
    "composition_balance": {
      "score": 0-10
    },
    "total_score": 0-100
  },
  "issues": ["list of specific issues found"],
  "recommendation": "ACCEPT" or "REJECT"
}

Be strict but fair. Score accurately based on what you observe.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: evaluationPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      console.error("[Evaluation] GPT did not return a response");
      return { passed: false, score: 0, hardRulesFailed: ["Evaluation failed"], details: null };
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Evaluation] Failed to parse evaluation response");
      return { passed: false, score: 0, hardRulesFailed: ["Parse error"], details: null };
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    
    const hardRulesPassed = evaluation.hard_rules?.passed === true;
    const totalScore = evaluation.scores?.total_score || 0;
    const hardRulesFailed = evaluation.hard_rules?.violations || [];
    
    // Production threshold: 85 minimum, and all hard rules must pass
    const passed = hardRulesPassed && totalScore >= 85;

    console.log(`[Evaluation] Score: ${totalScore}/100, Hard rules passed: ${hardRulesPassed}, Overall: ${passed ? 'PASS' : 'FAIL'}`);
    if (hardRulesFailed.length > 0) {
      console.log(`[Evaluation] Hard rule violations: ${hardRulesFailed.join(', ')}`);
    }
    if (evaluation.issues?.length > 0) {
      console.log(`[Evaluation] Issues: ${evaluation.issues.join(', ')}`);
    }

    return {
      passed,
      score: totalScore,
      hardRulesPassed,
      hardRulesFailed,
      details: evaluation
    };
  } catch (error) {
    console.error("[Evaluation] Error during evaluation:", error.message);
    // On evaluation error, we'll consider it as failed to be safe
    return { passed: false, score: 0, hardRulesFailed: [`Evaluation error: ${error.message}`], details: null };
  }
}

/**
 * Generate image with evaluation and retry logic
 * Attempts up to maxAttempts times, regenerating if evaluation fails
 */
async function generateWithEvaluation(descriptions, maxAttempts = 3) {
  let bestResult = null;
  let bestScore = -1;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Generator] Generation attempt ${attempt}/${maxAttempts}`);
    
    try {
      // Generate the image
      const result = await generateWithGemini3(descriptions);
      
      // Evaluate the generated image
      console.log(`[Generator] Evaluating generated image (attempt ${attempt})...`);
      const evaluation = await evaluateGeneratedImage(result.imageData, result.mimeType);
      
      // Track the best result so far
      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        bestResult = {
          ...result,
          evaluation
        };
      }
      
      // If evaluation passes, return immediately
      if (evaluation.passed) {
        console.log(`[Generator] Image passed evaluation on attempt ${attempt} with score ${evaluation.score}/100`);
        return bestResult;
      }
      
      // Log why it failed
      console.log(`[Generator] Attempt ${attempt} failed evaluation (score: ${evaluation.score}/100)`);
      if (!evaluation.hardRulesPassed) {
        console.log(`[Generator] Hard rule violations: ${evaluation.hardRulesFailed.join(', ')}`);
      }
      
      if (attempt < maxAttempts) {
        console.log(`[Generator] Regenerating with original prompt...`);
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[Generator] Attempt ${attempt} failed with error:`, error.message);
      
      if (attempt === maxAttempts) {
        // If this was the last attempt and we have a previous result, return it
        if (bestResult) {
          console.log(`[Generator] Returning best result from previous attempts (score: ${bestScore}/100)`);
          return bestResult;
        }
        throw error;
      }
      
      // Wait before retry on error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // If we've exhausted all attempts but have a result, return the best one
  if (bestResult) {
    console.log(`[Generator] All ${maxAttempts} attempts completed. Returning best result with score ${bestScore}/100`);
    console.log(`[Generator] Note: Image did not meet the 85-point threshold but was the best generated`);
    return bestResult;
  }
  
  throw new Error(`Failed to generate acceptable image after ${maxAttempts} attempts`);
}

/**
 * Retry helper with exponential backoff for transient errors
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 2000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:retryWithBackoff',message:'Attempt starting',data:{attempt,maxRetries},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const result = await fn();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:retryWithBackoff',message:'Attempt succeeded',data:{attempt},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return result;
    } catch (error) {
      lastError = error;
      const isRetryable = error.status === 503 || error.status === 429 || error.message?.includes('overloaded');
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini.js:retryWithBackoff',message:'Attempt failed',data:{attempt,isRetryable,errorStatus:error.status,errorMessage:error.message?.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`[Gemini3] Attempt ${attempt} failed (${error.status || 'error'}), retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Generate wedding portrait using Gemini 3 Pro Image Preview
 */
async function generateWithGemini3(descriptions) {
  // Extract values from the new structure (bride/groom with primary/alternates)
  const bride = descriptions.bride;
  const groom = descriptions.groom;

  // Helper to get primary value or fallback
  const getPrimary = (attr, fallback = 'average') => {
    if (!attr) return fallback;
    return attr.primary || fallback;
  };

  const prompt = `Create a full-body, front-facing illustration of a bride and groom in a Studio Ghibli–inspired style (soft, painterly, warm colors, gentle outlines, slightly whimsical but realistic proportions).

The image must contain only the two characters on a pure white background, with no props, no scenery, no text.

Characters (use these parameters)

Bride

Height: ${getPrimary(bride?.height)}

Skin color: ${getPrimary(bride?.skin_color)}

Hairstyle: ${getPrimary(bride?.hairstyle)}

Eye color: ${getPrimary(bride?.eye_color)}

Body shape: ${getPrimary(bride?.body_shape)}, refined to be ~10% more proportionally idealized while staying natural

Face shape: ${getPrimary(bride?.face_shape)}

Spectacles: ${getPrimary(bride?.spectacles, 'none')}

Groom

Height: ${getPrimary(groom?.height)}

Skin color: ${getPrimary(groom?.skin_color)}

Hairstyle: ${getPrimary(groom?.hairstyle)}

Eye color: ${getPrimary(groom?.eye_color)}

Body shape: ${getPrimary(groom?.body_shape)}, refined to be ~10% more proportionally idealized while staying natural

Facial hair style: ${getPrimary(groom?.facial_hair_style)}

Face shape: ${getPrimary(groom?.face_shape)}

Spectacles: ${getPrimary(groom?.spectacles, 'none')}

Fixed Pose & Expression

The couple is standing side-by-side, holding hands, in an Indian wedding–appropriate pose

Both are facing directly forward

Both look very happy, with warm, joyful expressions

No side profiles, no dynamic angles

Fixed Attire (Do not modify)

Groom Attire

Knee-length structured Sherwani in light beige or cream

Subtle golden floral pattern throughout

Teal peacock embroidery on left chest and lower hem

Deep magenta/maroon velvet dupatta over right shoulder with gold borders and peacock motifs

White Churidar bottoms

Golden tan Mojari/Jutti shoes

Bride Attire

Lehenga Choli in soft blush/pastel pink

Voluminous A-line lehenga with floral embroidery and mandala patterns in rose pink, teal, and gold

Matching blouse with delicate floral threadwork

Light pink sheer dupatta with gold-embroidered border

Traditional Indian gold jewelry: layered necklace, oversized jhumkas, pearl maang tikka

Style Constraints

Ghibli-inspired aesthetic: soft shading, rounded facial features, expressive eyes, gentle light

Proportions realistic but slightly stylized

Clean edges, no chibi, no hyper-realism, no caricature

Balanced symmetry between bride and groom

Output Rules

Only the two characters

White background only

No scenery, furniture, or decorations

No text or logos

Full-body visible, from head to toe`;

  console.log("[Gemini3] Generating with prompt:", prompt.slice(0, 200) + "...");

  // Use retry logic for transient API errors (503, 429)
  const response = await retryWithBackoff(async () => {
    return await genAI.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        responseModalities: ["image", "text"],
      },
    });
  }, 3, 3000);

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Gemini 3 Pro did not return any content");
  }

  // Find the image part in the response
  const imagePart = parts.find((part) => part.inlineData);
  if (!imagePart || !imagePart.inlineData) {
    throw new Error("Gemini 3 Pro did not return an image");
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

/**
 * Main function: Analyze photo with ChatGPT, generate with Gemini 3 Pro, evaluate and retry if needed
 */
export async function generateWeddingCharacters(photo) {
  console.log("[Generator] Starting wedding portrait generation");
  console.log("[Generator] Step 1: Analyzing photo with ChatGPT...");

  // Step 1: Analyze photo to extract descriptions using ChatGPT
  const descriptions = await analyzePhoto(photo);
  console.log("[Generator] Photo analysis complete:", JSON.stringify(descriptions, null, 2));

  // Step 2: Generate with Gemini 3 Pro, evaluate with GPT-4 Vision, retry up to 3 times if needed
  console.log("[Generator] Step 2: Generating image with Gemini 3 Pro (with evaluation & retry)...");
  const result = await generateWithEvaluation(descriptions, 3);

  console.log("[Generator] Generation complete!");
  console.log(`[Generator] Final score: ${result.evaluation?.score || 'N/A'}/100`);
  console.log(`[Generator] Passed evaluation: ${result.evaluation?.passed ? 'YES' : 'NO (best available)'}`);
  
  return {
    imageData: result.imageData,
    mimeType: result.mimeType,
    evaluation: result.evaluation
  };
}
