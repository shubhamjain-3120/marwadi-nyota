# Phase 2: Output Quality Upgrade

## Overview

Phase 2 improves the quality and consistency of generated wedding invite illustrations by:

1. **Enforcing animated illustration style** (not photorealistic)
2. **Using 3 prompt variants** with increasing strictness
3. **Rotating prompts on retry** to increase success probability

## Key Changes from Phase 1

| Aspect | Phase 1 | Phase 2 |
|--------|---------|---------|
| Output style | Semi-realistic | Animated illustration |
| Max retries | 5 (same prompt) | 3 (different prompts) |
| Prompt strategy | Single prompt | 3 rotating variants |
| Generation time | ~45 seconds | ~60 seconds (budgeted) |
| Pose enforcement | Basic | Strict with explicit template |

---

## Prompt Design Strategy

### Common Elements (All Prompts)

All three prompt variants share these core components:

#### 1. Fixed Pose Template
```
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
```

#### 2. Style Requirements
```
OUTPUT STYLE - ANIMATED ILLUSTRATION (CRITICAL):
- Style: Clean, modern animated illustration like a Pixar/Disney wedding portrait
- Soft, smooth illustrated skin with subtle shading
- Slightly stylized/exaggerated facial features (larger eyes, defined jawline)
- Clean vector-like line art with smooth edges
- Flat color fills with soft gradients for depth
- NOT photorealistic - clearly an artistic illustration
- NOT painterly or oil painting style
- Cel-shaded or digital illustration aesthetic
```

#### 3. Negative Constraints
```
DO NOT INCLUDE (strict):
- No background whatsoever - TRANSPARENT BACKGROUND ONLY
- No realistic photo textures or skin pores
- No painterly brush strokes or oil painting effects
- No blur or soft focus effects
- No extra people, animals, or props
- No furniture, decorations, or environmental elements
- No watermarks or text
- No cropping - full body must be visible
- No harsh shadows or dramatic lighting
```

---

## The Three Prompt Variants

### Prompt V1: Balanced (`v1-balanced`)

**Philosophy**: Good starting point that balances likeness preservation with animation style.

**Key characteristics**:
- Explicitly requests "ANIMATED ILLUSTRATION"
- Lists all features to preserve (skin tone, hair, body type)
- Uses positive framing for style requirements
- Standard negative constraints

**When it works best**: Photos with clear faces, good lighting, and typical body types.

**Sample opening**:
```
Create an ANIMATED ILLUSTRATION of a wedding couple for a traditional
Indian Marwadi wedding invitation card.
```

---

### Prompt V2: Strong Animation Bias (`v2-animation-bias`)

**Philosophy**: Emphasizes the animation style more aggressively with explicit studio references.

**Key characteristics**:
- References "Pixar, Dreamworks character design"
- Emphasizes "THIS MUST BE ANIMATED ART, NOT A PHOTO"
- Uses stronger language: "CRITICAL", "ABSOLUTELY NO"
- Describes desired look: "like a frame from an animated movie"

**When it works best**: When V1 produces semi-realistic output or when faces need simplification.

**Sample opening**:
```
Generate a STYLIZED ANIMATED CHARACTER ILLUSTRATION of a wedding couple
in the style of modern animation studios (think Pixar, Dreamworks
character design).
```

---

### Prompt V3: Strict Pose + Strict Animation (`v3-strict`)

**Philosophy**: Maximum enforcement with explicit rejection of realism.

**Key characteristics**:
- Frames as "2D ANIMATED CHARACTER ILLUSTRATION"
- Uses "MANDATORY" and "EXACT" language
- Explicitly states "REJECT any photorealistic elements"
- Separates pose instructions for clarity
- Lists "FORBIDDEN ELEMENTS" instead of "DO NOT"

**When it works best**: As a fallback when V1 and V2 fail, or for challenging inputs.

**Sample opening**:
```
You are creating a 2D ANIMATED CHARACTER ILLUSTRATION for a wedding
invitation. The output MUST look like hand-drawn digital art, NOT
a photograph.
```

---

## Retry Logic

### Sequence

```
Attempt 1 → Prompt V1 (balanced)
    ↓ (if no image returned)
    Wait 1.5 seconds
    ↓
Attempt 2 → Prompt V2 (animation bias)
    ↓ (if no image returned)
    Wait 1.5 seconds
    ↓
Attempt 3 → Prompt V3 (strict)
    ↓ (if no image returned)
    Return error (only after 3 failures)
```

### Behavior

- **Success on any attempt**: Return immediately with the generated image
- **All attempts fail**: Throw error (handled by server, shown as generic message to user)
- **No partial results**: We don't store "almost good" results - each attempt either returns an image or fails

### Logging

Each attempt logs:
- Attempt number and prompt variant name
- Duration of the attempt
- Success/failure status
- Total elapsed time

Example log output:
```
[Gemini] Starting generation - mode: couple, photos: 1
[Gemini] Attempt 1/3 using prompt v1-balanced
[Gemini] SUCCESS on attempt 1
[Gemini] Prompt variant: v1-balanced
[Gemini] Attempt duration: 12453ms
[Gemini] Total duration: 12453ms
```

---

## How Animated Style is Enforced

### Positive Enforcement

1. **Explicit style references**: "Pixar/Disney", "Dreamworks", "animated movie"
2. **Technical descriptions**: "cel-shaded", "vector-like line art", "flat color fills"
3. **Feature modifications**: "slightly larger eyes", "stylized proportions"

### Negative Enforcement

1. **Explicit rejections**: "NOT photorealistic", "No realistic photo textures"
2. **Texture bans**: "No skin pores", "No painterly brush strokes"
3. **Effect bans**: "No blur", "No harsh shadows"

### Progressive Strictness

- V1: Requests animation style
- V2: Demands animation style with examples
- V3: Commands animation style with rejection of realism

---

## How Pose is Enforced

### Single Canonical Pose

All prompts use the same pose template to ensure consistency:

```
- Groom: LEFT side
- Bride: RIGHT side
- 3/4 angle facing viewer
- Groom's arm around bride
- Full body, head to toe
- Natural height difference preserved
```

### Mode Handling

**Couple mode (1 photo)**:
- Original pose is NOT preserved
- Canonical pose is enforced
- Only likeness (face/body features) extracted from photo

**Individual mode (2 photos)**:
- Same canonical pose used
- Each person's likeness extracted separately
- Combined into single illustration

---

## Frontend Changes

### LoadingScreen Duration

**Phase 1**: 45 seconds to reach 90%
**Phase 2**: 60 seconds to reach 90%

This accounts for:
- Up to 3 generation attempts
- 1.5 second delays between attempts
- ~15-20 seconds per attempt worst case

The progress bar still:
- Eases smoothly using `easeOutQuad`
- Updates every 500ms
- Jumps to 100% when generation completes

---

## Integration Instructions

### Files Changed

1. `backend/gemini.js` - Complete rewrite with new prompts and retry logic
2. `frontend/src/components/LoadingScreen.jsx` - Duration increase only

### No Changes Required

- `backend/server.js` - API contract unchanged
- `frontend/src/App.jsx` - State management unchanged
- `frontend/src/components/InputScreen.jsx` - Form unchanged
- `frontend/src/components/ResultScreen.jsx` - Display unchanged
- `frontend/src/utils/canvasComposer.js` - Composition unchanged

### Testing

1. Start backend: `GEMINI_API_KEY=your_key npm run dev`
2. Start frontend: `npm run dev`
3. Upload a photo and generate
4. Check backend console for:
   - Which prompt variant succeeded
   - Timing information
   - Any retry attempts

### Monitoring Success Rates

To analyze which prompts work best, grep the logs:

```bash
# Count successes by prompt variant
grep "Prompt variant:" backend.log | sort | uniq -c

# Check average attempt counts
grep "SUCCESS on attempt" backend.log | awk '{print $5}' | sort | uniq -c
```

---

## Non-Goals (Not Implemented)

- ❌ Regenerate button
- ❌ Photo quality guidance/validation
- ❌ Face similarity scoring
- ❌ Multiple pose options
- ❌ User-facing error messages
- ❌ Analytics dashboard
- ❌ A/B testing framework

The focus is purely on backend intelligence to improve output quality while maintaining the simple UX.
