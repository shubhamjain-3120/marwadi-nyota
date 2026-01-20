#!/bin/bash

# Setup script for Wedding Invite MVP assets
# Run this script to download fonts and create placeholder assets

set -e

FRONTEND_DIR="$(dirname "$0")/../frontend"
FONTS_DIR="$FRONTEND_DIR/public/fonts"
ASSETS_DIR="$FRONTEND_DIR/public/assets"

echo "Setting up assets for Wedding Invite MVP..."

# Create directories
mkdir -p "$FONTS_DIR"
mkdir -p "$ASSETS_DIR"

# Download Google Fonts
echo "Downloading fonts..."

# Great Vibes
curl -L -o "$FONTS_DIR/GreatVibes-Regular.ttf" \
  "https://github.com/AgarwalsRahul/Google-Fonts/raw/main/GreatVibes-Regular.ttf" 2>/dev/null || \
curl -L -o "$FONTS_DIR/GreatVibes-Regular.ttf" \
  "https://raw.githubusercontent.com/AgarwalsRahul/Google-Fonts/main/GreatVibes-Regular.ttf" 2>/dev/null || \
echo "Warning: Could not download GreatVibes font. Please download manually from Google Fonts."

# Playfair Display
curl -L -o "$FONTS_DIR/PlayfairDisplay-Regular.ttf" \
  "https://github.com/AgarwalsRahul/Google-Fonts/raw/main/PlayfairDisplay-Regular.ttf" 2>/dev/null || \
curl -L -o "$FONTS_DIR/PlayfairDisplay-Regular.ttf" \
  "https://raw.githubusercontent.com/AgarwalsRahul/Google-Fonts/main/PlayfairDisplay-Regular.ttf" 2>/dev/null || \
echo "Warning: Could not download PlayfairDisplay font. Please download manually from Google Fonts."

# Create placeholder background (1080x1920 cream with border)
echo "Creating placeholder background..."
cat > "$ASSETS_DIR/background.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF8DC"/>
      <stop offset="50%" style="stop-color:#FFE4B5"/>
      <stop offset="100%" style="stop-color:#DEB887"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D4AF37"/>
      <stop offset="50%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#B8860B"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect x="30" y="30" width="1020" height="1860" fill="none" stroke="url(#gold)" stroke-width="15" rx="20"/>
  <rect x="60" y="60" width="960" height="1800" fill="none" stroke="url(#gold)" stroke-width="3" rx="15"/>
  <!-- Decorative corners -->
  <path d="M80 120 Q80 80 120 80" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <path d="M1000 120 Q1000 80 960 80" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <path d="M80 1800 Q80 1840 120 1840" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <path d="M1000 1800 Q1000 1840 960 1840" fill="none" stroke="url(#gold)" stroke-width="4"/>
</svg>
EOF

# Convert SVG to PNG if ImageMagick is available
if command -v convert &> /dev/null; then
  convert "$ASSETS_DIR/background.svg" "$ASSETS_DIR/background.png"
  echo "Created background.png"
else
  echo "Note: Install ImageMagick to convert SVG to PNG, or use background.svg directly"
fi

# Create placeholder mascot
echo "Creating placeholder mascot..."
cat > "$ASSETS_DIR/mascot.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="80" fill="#FFE4B5" stroke="#D4AF37" stroke-width="4"/>
  <circle cx="70" cy="80" r="10" fill="#4A3728"/>
  <circle cx="130" cy="80" r="10" fill="#4A3728"/>
  <path d="M60 120 Q100 160 140 120" fill="none" stroke="#4A3728" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="100" cy="40" rx="30" ry="15" fill="#8B0000"/>
</svg>
EOF

if command -v convert &> /dev/null; then
  convert "$ASSETS_DIR/mascot.svg" "$ASSETS_DIR/mascot.png"
  echo "Created mascot.png"
fi

# Create PWA icons
echo "Creating PWA icons..."
cat > "$ASSETS_DIR/icon-192.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="20" fill="#8B0000"/>
  <text x="96" y="110" font-family="serif" font-size="80" fill="#FFD700" text-anchor="middle">W</text>
</svg>
EOF

cat > "$ASSETS_DIR/icon-512.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="50" fill="#8B0000"/>
  <text x="256" y="300" font-family="serif" font-size="220" fill="#FFD700" text-anchor="middle">W</text>
</svg>
EOF

if command -v convert &> /dev/null; then
  convert "$ASSETS_DIR/icon-192.svg" "$ASSETS_DIR/icon-192.png"
  convert "$ASSETS_DIR/icon-512.svg" "$ASSETS_DIR/icon-512.png"
  echo "Created PWA icons"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Notes:"
echo "1. Replace background.png with your custom wedding template (1080x1920)"
echo "2. Replace mascot.png with your custom loading mascot"
echo "3. If fonts weren't downloaded, get them from fonts.google.com:"
echo "   - Great Vibes: https://fonts.google.com/specimen/Great+Vibes"
echo "   - Playfair Display: https://fonts.google.com/specimen/Playfair+Display"
