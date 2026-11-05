#!/usr/bin/env bash
# Portable preview bundle: builds with explicit index.html links (works on any static host)
# and zips site/ to dist/gt-preview-<date>.zip. Preview mode: noindex, enquiries not sent.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SITE_ENV=preview ENQUIRY_MODE=preview LINK_STYLE=files node src/build.mjs
mkdir -p dist
OUT="dist/gt-preview-$(date +%Y-%m-%d).zip"
rm -f "$OUT"
(cd site && zip -qr "../$OUT" . -x '.DS_Store')
ls -la "$OUT"
# Restore the default (pretty-link) build
node src/build.mjs >/dev/null
