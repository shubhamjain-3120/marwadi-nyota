# Phase 4: Flat Vector Style + UX Improvements

## Architecture Summary

### Key Changes from Phase 3

| Component | Phase 3 | Phase 4 |
|-----------|---------|---------|
| **Style** | Semi-3D, painterly, gradient shading | Flat vector, thin outlines, minimal shading |
| **Photo Mode** | Radio buttons (manual selection) | Auto-detect count, Swap button for 2 photos |
| **Background** | Gemini transparent output | Gemini solid background + client-side removal |
| **Date Input** | Free text | Native date picker |
| **Loading** | 200px mascot, 60s duration | 320px mascot, 72s duration |
| **Layout** | Heuristic placement | Hard-coded percent-based geometry |

---

## 1. UX Flow

### 1.1 Single Photo Flow

```
┌─────────────────────────────────────────────┐
│  User uploads 1 photo                       │
│  ↓                                          │
│  System auto-detects: single photo          │
│  ↓                                          │
│  Show single photo thumbnail                │
│  Label: "Couple Photo"                      │
│  ↓                                          │
│  User fills: Names, Date, Venue             │
│  ↓                                          │
│  Generate → Loading → Result                │
└─────────────────────────────────────────────┘
```

### 1.2 Two Photo Flow

```
┌─────────────────────────────────────────────┐
│  User uploads 2 photos (via multi-select    │
│  or sequential uploads)                     │
│  ↓                                          │
│  System auto-detects: two photos            │
│  ↓                                          │
│  Show thumbnails side-by-side:              │
│  ┌─────────┐  [↔]  ┌─────────┐              │
│  │ Photo 1 │ SWAP  │ Photo 2 │              │
│  │ (Groom) │       │ (Bride) │              │
│  └─────────┘       └─────────┘              │
│  ↓                                          │
│  User can tap SWAP to exchange positions    │
│  ↓                                          │
│  Generate → Loading → Result                │
└─────────────────────────────────────────────┘
```

### 1.3 Swap Button Behavior

- **Visual**: Small circular button with ↔ icon between the two thumbnails
- **Action**: Swaps `photo1` and `photo2` in state
- **No labels change**: Slots remain "Groom" and "Bride"
- **No confirmation**: Instant swap on tap

---

## 2. Photo Upload Component Design

### State Model

```javascript
const [photos, setPhotos] = useState([]); // Array of 0-2 File objects
const [isSwapped, setIsSwapped] = useState(false);

// Derived state
const photoCount = photos.length;
const mode = photoCount === 2 ? "individual" : "couple";
const groomPhoto = isSwapped ? photos[1] : photos[0];
const bridePhoto = isSwapped ? photos[0] : photos[1];
```

### Upload Behavior

1. **Single file input** with `multiple` attribute
2. User can select 1 or 2 photos at once
3. If user selects >2, take first 2
4. If user wants to replace, show "Change Photos" button

---

## 3. Visual Style: Flat Vector

### Target Aesthetic

```
- Clean, decorative Indian wedding card illustration
- Flat color fills (no gradients on skin)
- Thin, consistent outlines (1-2px visual weight)
- Minimal shading (only for form definition)
- High contrast, saturated colors
- Stylized but recognizable faces
- Ornate clothing patterns rendered as flat designs
```

### Style Reference Terms

```
✓ "flat vector illustration"
✓ "Indian wedding invitation card style"
✓ "clean thin outlines"
✓ "minimal shading"
✓ "decorative folk art style"
✓ "solid color fills"

✗ "3D", "realistic", "painterly"
✗ "gradient shading", "soft shadows"
✗ "photographic", "detailed textures"
✗ "cel-shaded", "anime"
```

---

## 4. Gemini Prompt Strategy

### Background Requirement Change

**Phase 3**: Request transparent background from Gemini
**Phase 4**: Request solid white/light background, remove client-side

**Rationale**:
- Gemini's transparent backgrounds often have artifacts
- Solid backgrounds are more consistent
- Client-side removal using imgly/background-removal-js is deterministic

### Prompt Structure

```
1. Style Declaration (flat vector, invitation card)
2. Photo Reference Instructions
3. Pose Template (unchanged)
4. Attire Template (simplified for flat style)
5. Negative Constraints (ban realism, 3D, gradients)
6. Background Requirement (solid white/cream)
```

---

## 5. Layout Coordinate Specification

### Canvas Dimensions

```
Width:  1080px
Height: 1920px
Aspect: 9:16 (standard mobile wallpaper)
```

### Layout Zones (Percent-Based)

```
┌────────────────────────────────────────┐ 0%
│                                        │
│          DECORATIVE ARCH AREA          │
│                                        │ 10%
├────────────────────────────────────────┤
│                                        │
│             NAMES TEXT                 │ 15%
│        (1.4N, GreatVibes, Gold)        │
│                                        │ 20%
├────────────────────────────────────────┤
│                                        │
│                                        │
│                                        │
│                                        │
│           CHARACTER AREA               │
│         (60-65% of height)             │
│                                        │
│      Heads align: ~25% from top        │
│      Feet align: ~80% from top         │
│                                        │
│                                        │
│                                        │ 80%
├────────────────────────────────────────┤
│         SOFT SHADOW ELLIPSE            │ 82%
├────────────────────────────────────────┤
│                                        │
│              DATE TEXT                 │ 86%
│         (0.7N, Playfair, Brown)        │
│                                        │
│              VENUE TEXT                │ 90%
│         (0.7N, Playfair, Brown)        │
│                                        │ 95%
└────────────────────────────────────────┘ 100%
```

### Exact Pixel Values

```javascript
const LAYOUT_V4 = {
  canvas: { width: 1080, height: 1920 },

  character: {
    // Character occupies 60% of canvas height
    heightPercent: 0.60,

    // Horizontal: centered with 10% margin each side
    marginXPercent: 0.10,

    // Vertical positioning
    topPercent: 0.22,    // Heads start here (under arch apex)
    bottomPercent: 0.82, // Feet end here (above shadow)
  },

  shadow: {
    yPercent: 0.82,       // Just below feet
    widthPercent: 0.50,   // Shadow width relative to canvas
    heightPercent: 0.03,  // Shadow height
    blur: 30,
    opacity: 0.12,
  },

  names: {
    yPercent: 0.145,      // Vertical position
    fontRatio: 1.4,       // Relative to base size
    maxWidthPercent: 0.85,
  },

  date: {
    yPercent: 0.86,
    fontRatio: 0.7,
  },

  venue: {
    yPercent: 0.90,
    fontRatio: 0.7,
  },

  // Base font size (N)
  baseFontSize: 48,
};
```

---

## 6. Text Hierarchy

### Font Size Ratios

| Element | Ratio | Computed (N=48) | Font | Style |
|---------|-------|-----------------|------|-------|
| Names | 1.4N | 67px | GreatVibes | Gold gradient |
| Date | 0.7N | 34px | Playfair Display | Flat brown |
| Venue | 0.7N | 34px | Playfair Display | Flat brown |

### Auto-Resize Logic

```javascript
function calculateNamesFontSize(ctx, text, maxWidth) {
  const idealSize = LAYOUT_V4.baseFontSize * LAYOUT_V4.names.fontRatio; // 67px
  const minSize = LAYOUT_V4.baseFontSize * 0.8; // 38px

  let fontSize = idealSize;
  while (fontSize > minSize) {
    ctx.font = `${fontSize}px GreatVibes`;
    if (ctx.measureText(text).width <= maxWidth) {
      return fontSize;
    }
    fontSize -= 2;
  }
  return minSize;
}
```

---

## 7. Background Removal Pipeline

### Library: @imgly/background-removal

```javascript
import { removeBackground } from "@imgly/background-removal";

async function removeBackgroundFromImage(imageBlob) {
  const result = await removeBackground(imageBlob, {
    model: "medium",        // Balance of speed/quality
    output: { format: "image/png" },
  });
  return result;
}
```

### Pipeline Order

```
1. Gemini generates image with solid white background
2. Backend returns base64 image
3. Frontend converts to Blob
4. @imgly/background-removal processes
5. Result: clean alpha channel PNG
6. Canvas composer receives transparent image
```

---

## 8. Loading Screen Changes

### Mascot Size

```
Phase 3: max-width: 200px, max-height: 200px
Phase 4: max-width: 320px, max-height: 320px (1.6× increase)
```

### Progress Timing

```
Phase 3:
- Duration: 60,000ms (60 seconds)
- Interval: 500ms
- Target: 90%

Phase 4:
- Duration: 72,000ms (60s × 1.2 = 72 seconds)
- Interval: 750ms (avg of 700-800ms)
- Target: 90%
```

### Layout Order

```
┌─────────────────────────────────────┐
│                                     │
│   "बस 2 पल रो इंतज़ार सा…           │
│    मज़ा अभी बाकी है!"               │
│                                     │
│         ┌───────────┐               │
│         │           │               │
│         │  MASCOT   │  ← 1.6× larger│
│         │  (320px)  │               │
│         │           │               │
│         └───────────┘               │
│                                     │
│   ████████████░░░░░░░░  45%         │
│                                     │
│   Creating your invite...           │
│                                     │
└─────────────────────────────────────┘
```

---

## 9. Date Picker

### Input Type

```html
<input type="date" />
```

### Format Function

```javascript
function formatDateForInvite(isoDate) {
  // Input: "2025-03-15"
  // Output: "15 March 2025"

  const date = new Date(isoDate);
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}
```

---

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Background removal fails on complex images | Medium | High | Fallback to Gemini's best-effort transparency |
| Flat vector style loses likeness | High | Medium | Accept trade-off; style consistency > likeness |
| Swap button confuses users | Low | Low | Clear labeling: "Groom" / "Bride" |
| Date picker inconsistent across browsers | Medium | Low | Polyfill or custom component if needed |
| Mascot size breaks on small screens | Low | Medium | Use responsive units, test on 320px width |

---

## 11. Open Design Decisions

### Needs Product Input

1. **Exact mascot image**: Current placeholder needs replacement with actual branded mascot

2. **Background template**: The fixed background.png needs final design approval

3. **Font licensing**: Verify GreatVibes and Playfair Display are properly licensed for commercial use

4. **Date format localization**: Currently "15 March 2025" - should it support Hindi ("१५ मार्च २०२५")?

5. **Venue line wrapping**: If venue text is very long, should it:
   - Shrink font?
   - Wrap to 2 lines?
   - Truncate with ellipsis?

6. **Photo upload feedback**: Should there be a toast/notification when 2 photos are detected?

---

## 12. Implementation Checklist

### Backend
- [ ] Rewrite Gemini prompts for flat vector style
- [ ] Request solid background instead of transparent
- [ ] Update logging for Phase 4

### Frontend - Components
- [ ] Redesign InputScreen with auto-detect photo flow
- [ ] Add Swap button between photos
- [ ] Replace text date input with native date picker
- [ ] Update LoadingScreen mascot size (1.6×)
- [ ] Update LoadingScreen progress timing (1.2× slower)

### Frontend - Pipeline
- [ ] Add @imgly/background-removal dependency
- [ ] Create backgroundRemoval.js utility
- [ ] Integrate removal into App.jsx flow
- [ ] Update canvasComposer.js with new layout

### Frontend - Styles
- [ ] Add styles for photo swap button
- [ ] Add styles for larger mascot
- [ ] Add styles for date picker

### Testing
- [ ] Test 1-photo flow end-to-end
- [ ] Test 2-photo flow with swap
- [ ] Test long names auto-resize
- [ ] Test on 320px width screen
- [ ] Test background removal on various photo types

---

## 13. File Changes Summary

| File | Change Type |
|------|-------------|
| `backend/gemini.js` | Major rewrite (new prompts) |
| `frontend/package.json` | Add background-removal dep |
| `frontend/src/App.jsx` | Add background removal step |
| `frontend/src/components/InputScreen.jsx` | Major redesign |
| `frontend/src/components/LoadingScreen.jsx` | Size + timing updates |
| `frontend/src/utils/canvasComposer.js` | New layout geometry |
| `frontend/src/utils/backgroundRemoval.js` | **NEW FILE** |
| `frontend/src/styles/index.css` | New component styles |
