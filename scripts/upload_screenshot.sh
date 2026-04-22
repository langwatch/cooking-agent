#!/usr/bin/env bash
# Upload a screenshot to img402.dev free tier and print the public URL.
# Usage: bash scripts/upload_screenshot.sh /path/to/file.{png,jpg,webp,gif}
#
# Free tier: <=1 MB, 7-day retention, no auth. See https://img402.dev.
# On "too big" errors, recompress locally — do not retry as-is.

set -euo pipefail

file="${1:-}"
if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "usage: $0 <path-to-image>" >&2
  exit 2
fi

size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
if [ "$size" -gt 1000000 ]; then
  echo "error: $file is ${size} bytes, exceeds img402 free-tier 1MB cap" >&2
  echo "recompress (jpeg q60, smaller viewport, no hi-dpi) before retrying" >&2
  exit 3
fi

resp=$(curl -sS --max-time 30 -F "file=@${file}" https://img402.dev/api/free)

url=$(printf '%s' "$resp" | jq -r '.url // .data.url // empty' 2>/dev/null || true)
if [ -z "$url" ]; then
  url=$(printf '%s' "$resp" | grep -oE 'https://img402\.dev/[^"[:space:]]+' | head -1 || true)
fi

if [ -z "$url" ]; then
  echo "error: could not parse img402 response" >&2
  echo "raw response: $resp" >&2
  exit 4
fi

echo "$url"
