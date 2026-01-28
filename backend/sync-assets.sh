#!/bin/bash
# Sync frontend assets to backend for deployment

echo "Syncing frontend assets..."

# Create directories if they don't exist
mkdir -p frontend/public/fonts
mkdir -p frontend/public/assets

# Copy fonts
cp ../frontend/public/fonts/*.ttf frontend/public/fonts/
echo "✓ Fonts synced"

# Copy assets
cp ../frontend/public/assets/background.mp4 frontend/public/assets/
cp ../frontend/public/assets/bg_audio.mp3 frontend/public/assets/
cp ../frontend/public/assets/dev-character.png frontend/public/assets/
echo "✓ Assets synced"

echo "Ready to deploy!"
