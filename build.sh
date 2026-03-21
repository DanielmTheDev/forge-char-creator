#!/bin/bash

# This script packages the module into a format that can be easily uploaded to The Forge or any Foundry VTT instance.

echo "🪄 Forging the module package..."

# Create a dist directory if it doesn't exist
mkdir -p dist

# Remove any old builds
rm -f dist/forge-char-creator.zip

# Zip everything except unnecessary development files
zip -r dist/forge-char-creator.zip ./* \
  -x "dist/*" \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".DS_Store" \
  -x "scripts/tests/*" \
  -x "README.md" \
  -x "DEPLOYMENT.md" \
  -x "workflows/*" \
  -x ".gitignore"

echo ""
echo "✅ Build complete!"
echo "Your module package is ready at: dist/forge-char-creator.zip"
echo ""
echo "See DEPLOYMENT.md for instructions on how to deploy this to The Forge."
