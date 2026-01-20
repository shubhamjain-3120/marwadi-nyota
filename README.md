# Wedding Invite Generator MVP

A minimal PWA for generating Marwadi wedding invitations using AI-generated couple portraits.

## Architecture

```
wedding-invite-mvp/
├── backend/                 # Node.js + Express server
│   ├── server.js           # API endpoints
│   └── gemini.js           # Gemini AI integration with retry logic
├── frontend/               # React + Vite PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── InputScreen.jsx    # Form for wedding details + photos
│   │   │   ├── LoadingScreen.jsx  # Progress indicator
│   │   │   └── ResultScreen.jsx   # Final invite display + share
│   │   └── utils/
│   │       └── canvasComposer.js  # Client-side image composition
│   └── public/
│       ├── fonts/          # GreatVibes, PlayfairDisplay
│       └── assets/         # Background template, mascot, icons
└── scripts/
    └── setup-assets.sh     # Asset setup script
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API key with image generation enabled

## Quick Start

### 1. Setup Assets (Already Done)

```bash
./scripts/setup-assets.sh
```

This downloads fonts and creates placeholder assets. Replace with your custom:
- `frontend/public/assets/background.png` - 1080x1920 wedding template
- `frontend/public/assets/mascot.png` - Loading screen mascot

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure Environment

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 4. Run Development Servers

Terminal 1 - Backend:
```bash
cd backend
GEMINI_API_KEY=your_key npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## API Contract

### POST /api/generate

Generate AI wedding portrait.

**Request:**
- `Content-Type: multipart/form-data`
- `photo1` (File, required): Couple photo OR groom photo
- `photo2` (File, optional): Bride photo (for individual mode)
- `mode` (string): `"couple"` or `"individual"`

**Response:**
```json
{
  "success": true,
  "characterImage": "data:image/png;base64,..."
}
```

## Key Design Decisions

### Photo Modes

1. **Couple Mode** (1 photo): Preserves the exact pose from the uploaded photo
2. **Individual Mode** (2 photos): Forces a standard wedding pose with groom on left, bride on right

### Gemini Integration

- Uses `gemini-2.0-flash-exp-image-generation` model
- Automatic retry with exponential backoff (up to 5 attempts)
- Prompts optimized for:
  - Preserving facial features, skin tone, body shape
  - Traditional Marwadi wedding attire
  - Transparent background output

### Canvas Composition

Client-side composition using HTML5 Canvas:
1. Load background template (1080x1920)
2. Overlay AI-generated character image
3. Render names with GreatVibes font + golden gradient
4. Render date/venue with PlayfairDisplay font
5. Export as PNG

### Progress Simulation

- Eases from 0% to 90% over ~45 seconds
- Jumps to 100% when generation completes
- Updates every 500ms for smooth animation

## Customization

### Change Background Template

Replace `frontend/public/assets/background.png` with your 1080x1920 design.

### Adjust Text Positioning

Edit `frontend/src/utils/canvasComposer.js`:

```javascript
const LAYOUT = {
  names: { y: 280 },      // Names vertical position
  details: {
    dateY: 1650,          // Date vertical position
    venueY: 1720          // Venue vertical position
  }
};
```

### Modify Prompts

Edit `backend/gemini.js` to customize the AI generation prompts.

## Production Build

```bash
# Build frontend
cd frontend
npm run build

# Serve with backend
cd ../backend
npm start
```

For production, configure Vite proxy to point to your deployed backend URL.

## Android WebView Integration

The PWA is designed for Android WebView packaging:

1. Build the frontend: `npm run build`
2. Copy `frontend/dist/` to your Android project's assets
3. Load `index.html` in WebView
4. Configure WebView for file access and JavaScript

## Troubleshooting

### "Generation failed" error
- Check Gemini API key is valid
- Ensure API has image generation enabled
- Check backend logs for detailed errors

### Fonts not rendering
- Verify fonts exist in `frontend/public/fonts/`
- Check browser console for font loading errors

### Share not working on Android
- Web Share API requires HTTPS in production
- Fallback opens WhatsApp with text only

## Tech Stack

- **Frontend**: React 18, Vite 5, HTML5 Canvas
- **Backend**: Node.js, Express 4, Multer
- **AI**: Google Gemini 2.0 Flash (Image Generation)
- **Styling**: CSS with CSS Variables
