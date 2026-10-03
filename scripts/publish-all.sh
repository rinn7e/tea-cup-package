#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Ensure PUBLISH_GITHUB_PACKAGE_TOKEN is set
if [ -z "${PUBLISH_GITHUB_PACKAGE_TOKEN:-}" ]; then
  echo "❌ Error: PUBLISH_GITHUB_PACKAGE_TOKEN is not set."
  echo "Please export your personal GitHub token with 'write:packages' scope:"
  echo "  export PUBLISH_GITHUB_PACKAGE_TOKEN=ghp_pat_for_publish_packages"
  exit 1
fi

echo "🌸 Building all packages first..."
cd "$ROOT_DIR"
pnpm run build
pnpm --filter @rinn7e/tea-cup-rte-toolkit build

# Publish in dependency order
PACKAGES=(
  "package/tea-cup-prelude"
  "package/tea-cup-intersection-observer"
  "package/tea-cup-rte-toolkit"
  "package/tea-cup-router"
  "package/tea-cup-pagination"
  "package/tea-cup-link-pagination"
  "package/tea-cup-form"
  "package/tea-cup-drawer"
  "package/tea-cup-screen"
)

echo "🚀 Publishing packages to GitHub Packages (https://npm.pkg.github.com)..."
for pkg in "${PACKAGES[@]}"; do
  echo "📦 Publishing $pkg..."
  (cd "$ROOT_DIR/$pkg" && npm publish --access public --//npm.pkg.github.com/:_authToken="$PUBLISH_GITHUB_PACKAGE_TOKEN")
  echo "✨ Successfully published $pkg!"
done

echo "🎉 All 9 packages published to GitHub Packages!"
