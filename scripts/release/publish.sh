#!/usr/bin/env bash
# Publish one module release from CI.
#   publish.sh <module-id> <version> <notes> <file>...
# Creates the immutable <id>-v<version> release, then refreshes the rolling
# <id>-latest release (the Foundry manifest URL) with the same files.
# Zip first, module.json last: a manifest never points at a missing zip.
set -euo pipefail
id="$1"; version="$2"; notes="$3"; shift 3
tag="${id}-v${version}"
pointer="${id}-latest"

gh release create "$tag" "$@" --target "$GITHUB_SHA" --title "$id $version" --notes "$notes" --latest=false

gh release view "$pointer" >/dev/null 2>&1 || gh release create "$pointer" --target "$GITHUB_SHA" \
  --title "$id (current)" --latest=false \
  --notes "Rolling pointer to the newest $id release. Foundry manifest URL: releases/download/$pointer/module.json. Versioned releases: $id-v*."
for f in "$@"; do if [[ "$f" != *module.json ]]; then gh release upload "$pointer" "$f" --clobber; fi; done
for f in "$@"; do if [[ "$f" == *module.json ]]; then gh release upload "$pointer" "$f" --clobber; fi; done
gh release edit "$pointer" --notes "Current: $id $version ($tag). Foundry manifest URL: releases/download/$pointer/module.json."
echo "released $tag"
