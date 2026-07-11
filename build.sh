#!/bin/bash

# This script packages the module into a format that can be easily uploaded to The Forge or any Foundry VTT instance.

echo "🪄 Forging the module package..."

# Create a dist directory if it doesn't exist
mkdir -p dist

# Remove any old builds
rm -f dist/forge-char-creator.zip

# Build compiled packs from JSON source (packs/ is gitignored).
npm run packs:build forge-char-creator

# Zip module files. CRITICAL: -y stores symlinks AS symlinks (does NOT follow
# them). FoundryData/Data/.../forge-char-creator is a symlink BACK to this repo;
# without -y (or excluding it) zip recurses the symlink infinitely -> unbounded
# RAM -> system freeze. Also exclude the Foundry binary + data dirs (huge / not
# part of the module).
zip -ry dist/forge-char-creator.zip ./* \
  -x "dist/*" \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".DS_Store" \
  -x "scripts/tests/*" \
  -x "scripts/pack-tools/*" \
  -x "scripts/bump-version.mjs" \
  -x "src/*" \
  -x "tests/*" \
  -x "test.sh" \
  -x "docs/*" \
  -x "agents.md" \
  -x "package.json" \
  -x "package-lock.json" \
  -x "build.sh" \
  -x "FoundryData/*" \
  -x "Data/*" \
  -x "world-export/*" \
  -x "FoundryVTT-Linux-13.351/*" \
  -x "test-results/*" \
  -x "DEPLOYMENT.md" \
  -x "workflows/*" \
  -x ".github/*" \
  -x ".gitignore" \
  -x "forge-content/*" \
  -x "CLAUDE.md" \
  -x "TODO.md" \
  -x "content-verify.sh" \
  -x "playwright*.js"

echo ""
echo "✅ Build complete!"
echo "Your module package is ready at: dist/forge-char-creator.zip"
echo ""
echo "See DEPLOYMENT.md for instructions on how to deploy this to The Forge."
