# Phase 3: Premium Artwork Rendering

## Overview

Phase 3 transforms the output from "nice animated illustration" to "premium wedding invitation artwork" through:

1. **Upgraded Gemini prompts** - Enforce semi-3D illustrated style with soft gradients
2. **Client-side post-processing** - Deterministic canvas operations for professional finish

No new AI models, no reference images, no UX changes.

---

## Part 1: Gemini Prompt Upgrade

### Style Philosophy Change

| Phase 2 | Phase 3 |
|---------|---------|
| Flat vector/cel-shaded | Semi-3D with soft gradients |
| Clean line art | Painterly soft edges |
| Solid color fills | Luminous tonal variations |
| Digital illustration | Premium stationery artwork |

### Premium Style Requirements

```
OUTPUT STYLE - PREMIUM INDIAN WEDDING CARD ILLUSTRATION:

RENDERING QUALITY:
- Semi-3D illustrated artwork with dimensional depth
- Soft gradient shading on skin - smooth tonal transitions
- Gentle ambient occlusion in fabric folds
- Subtle rim lighting on edges for separation
- Rich, luminous colors with depth - not flat fills
- Painterly softness with smooth blended edges

SHADING & LIGHTING:
- Soft diffused lighting from upper front
- Gentle shadows under chin, arms, in fabric creases
- Smooth gradient transitions - NO hard edges
- Subtle highlight catches on jewelry and fabric
- Warm golden undertones in shadows
```

### Negative Constraints (Critical)

```
DO NOT USE:
- No flat vector shading or solid color fills
- No thick black outlines or bold strokes
- No clip-art or stock illustration style
- No cartoon proportions or exaggerated features
- No hard cel-shading with sharp shadow edges
- No anime or manga style
- No watercolor wet edges
- No photorealistic textures
```

### The Three Prompt Variants

#### V1: Premium Balanced (`v1-premium-balanced`)
- Requests "premium wedding invitation illustration"
- Emphasizes "high-end wedding stationery artwork"
- Balanced between likeness preservation and artistic rendering

#### V2: Premium Painterly (`v2-premium-painterly`)
- Stronger emphasis on painterly softness
- References "luxury wedding portrait illustration"
- Explicit: "NOT flat, NOT vector, NOT cartoon"

#### V3: Premium Strict (`v3-premium-strict`)
- Maximum enforcement of premium style
- Detailed "THIS IS NOT" list
- Describes exact visual characteristics expected

---

## Part 2: Post-Processing Pipeline

### Pipeline Order

```
1. Edge Feathering    → Softens hard cutout edges
2. Ground Shadow      → Adds contact shadow under feet
3. Color Harmonization → Tints toward background palette
4. Contrast & Gamma   → Enhances tonal richness
```

### Step 1: Edge Feathering

**What it does:**
Applies a subtle alpha blur (1-2px) to edge pixels only, softening the hard "cutout" border that AI-generated transparent PNGs often have.

**Why it improves invite feel:**
- Removes jarring hard edges that look "pasted on"
- Creates natural blending with any background
- Mimics the soft edges of hand-painted illustrations
- Professional composites always have soft edges

**Parameters:**
```javascript
edgeFeather: {
  enabled: true,
  radius: 1.5,      // Blur radius (1-3 recommended)
  iterations: 2,    // Blur passes for smoothness
}
```

**Tuning:**
- Increase `radius` (up to 3) if edges still look harsh
- Decrease `radius` (to 1) if details are getting blurry
- Increase `iterations` for smoother falloff

---

### Step 2: Ground Shadow

**What it does:**
Generates a soft oval shadow beneath the characters' feet, anchored to the floor plane.

**Why it improves invite feel:**
- Grounds the characters in the scene (not floating)
- Adds subtle depth and dimension
- Creates visual weight and presence
- Professional illustrations always have contact shadows

**Parameters:**
```javascript
groundShadow: {
  enabled: true,
  offsetY: 0.02,      // Vertical offset (fraction of canvas height)
  width: 0.6,         // Shadow width (fraction of character width)
  height: 0.08,       // Shadow height (fraction of character width)
  blur: 25,           // Blur radius for softness
  opacity: 0.15,      // Shadow opacity (0.1-0.2 recommended)
  color: [30, 20, 15], // RGB (warm dark brown)
}
```

**Tuning:**
- Increase `opacity` (up to 0.25) for more pronounced grounding
- Decrease `blur` for sharper, more defined shadow
- Adjust `width` based on character stance width
- Change `color` to match background undertones

---

### Step 3: Color Harmonization

**What it does:**
Samples the average background color near the feet area, then subtly tints the character's lower portions and shadow areas toward that hue.

**Why it improves invite feel:**
- Integrates character with background palette
- Removes "pasted on" appearance
- Creates color cohesion like professional illustrations
- Mimics ambient light bouncing from the ground

**Parameters:**
```javascript
colorHarmonize: {
  enabled: true,
  sampleY: 0.95,        // Y position to sample background
  blendStrength: 0.07,  // Tint strength (0.05-0.10)
  affectShadows: true,  // Apply stronger tint to dark areas
  shadowBoost: 1.5,     // Multiplier for shadow tinting
}
```

**Tuning:**
- Increase `blendStrength` (up to 0.12) for warmer integration
- Decrease `blendStrength` (to 0.04) if colors look washed
- Set `affectShadows: false` if shadow areas look too tinted
- Adjust `sampleY` if background has different colors at feet level

---

### Step 4: Contrast & Gamma Adjustment

**What it does:**
Enhances the tonal range through gamma correction (enriches mid-tones), contrast boost, highlight reduction, and black point lift.

**Why it improves invite feel:**
- Increases visual punch without harshness
- Enriches mid-tones for depth and dimension
- Prevents washed-out appearance
- Adds professional print-ready quality

**Parameters:**
```javascript
contrastGamma: {
  enabled: true,
  contrast: 1.08,       // Contrast multiplier (1.05-1.15)
  gamma: 0.95,          // <1 = richer mids, >1 = lighter
  highlightReduce: 0.03, // Reduce blown highlights
  blackPoint: 5,        // Lift blacks slightly
}
```

**Tuning:**
- Increase `contrast` (up to 1.15) for more punch
- Decrease `gamma` (to 0.90) for richer, deeper tones
- Increase `gamma` (to 1.0) if image looks too dark
- Increase `blackPoint` (to 10) if shadows look crushed

---

## Integration Architecture

### Composition Order

```
┌─────────────────────────────────────┐
│  1. Load background image           │
│  2. Load character image            │
│  3. Create background canvas        │
│  4. Create character canvas         │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  POST-PROCESSING PIPELINE           │
│  (on character canvas only)         │
│                                     │
│  1. Edge feathering                 │
│  2. Color harmonization             │
│  3. Contrast & gamma                │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  FINAL COMPOSITION                  │
│                                     │
│  Layer 1: Background                │
│  Layer 2: Ground shadow             │
│  Layer 3: Processed character       │
│  Layer 4: Text overlays             │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Export PNG                         │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Post-processing happens BEFORE compositing** - This allows the character to be processed independently, then properly layered.

2. **Shadow is a separate layer** - Drawn behind the character for proper depth ordering.

3. **Color harmonization samples the background** - This ensures the tinting matches the actual background being used.

4. **All operations are deterministic** - Same input always produces same output; no randomness or ML.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/gemini.js` | New premium-style prompts (v1, v2, v3) |
| `frontend/src/utils/postProcessing.js` | **NEW** - Post-processing pipeline |
| `frontend/src/utils/canvasComposer.js` | Integrated post-processing |

### No Changes To

- API contract
- Frontend components
- UX flow
- Loading screen
- Result screen

---

## Performance

Post-processing adds minimal overhead:

| Step | Typical Time |
|------|-------------|
| Edge feathering | 30-50ms |
| Color harmonization | 20-40ms |
| Contrast & gamma | 15-25ms |
| **Total** | **~100ms** |

This is negligible compared to the 15-60 second AI generation time.

---

## Console Logging

The pipeline logs timing for each step:

```
[Composer] Starting Phase 3 composition with post-processing...
[Composer] Images loaded: 45.2ms
[PostProcess] Starting pipeline...
[PostProcess] Edge feathering: 38.4ms
[PostProcess] Color harmonization: 28.1ms
[PostProcess] Contrast & gamma: 19.7ms
[PostProcess] Pipeline complete: 86.2ms total
[Composer] Post-processing complete: 142.8ms
[Composer] Final composition complete: 156.3ms
```

---

## Tuning Guide

### For "Too Flat" Output

Increase these values:
- `contrastGamma.contrast` → 1.12
- `contrastGamma.gamma` → 0.92
- `groundShadow.opacity` → 0.20

### For "Too Dark" Output

Decrease these values:
- `contrastGamma.gamma` → 0.98
- `contrastGamma.contrast` → 1.05
- `colorHarmonize.blendStrength` → 0.05

### For "Harsh Edges"

Increase these values:
- `edgeFeather.radius` → 2.5
- `edgeFeather.iterations` → 3

### For "Floating Characters"

Increase these values:
- `groundShadow.opacity` → 0.22
- `groundShadow.blur` → 20 (less blur = sharper)

### For "Disconnected from Background"

Increase these values:
- `colorHarmonize.blendStrength` → 0.10
- `colorHarmonize.shadowBoost` → 2.0

---

## Non-Goals (Not Implemented)

- ❌ Reference images for style guidance
- ❌ Style selection UI
- ❌ ML-based quality assessment
- ❌ Regenerate button
- ❌ Any UX changes

The focus is purely on automated quality improvement through prompts and deterministic post-processing.
