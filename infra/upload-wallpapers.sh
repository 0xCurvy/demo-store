#!/usr/bin/env bash
# Puts the 4K files into an environment's R2 bucket. Usage: infra/upload-wallpapers.sh production|development
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment, and the PNGs in wallpapers/.
set -euo pipefail

environment="${1:?usage: upload-wallpapers.sh production|development}"
bucket="brutalism-store-${environment}-wallpapers"
root="$(cd "$(dirname "$0")/.." && pwd)"

shopt -s nullglob
files=("$root"/wallpapers/*.png)

if [ "${#files[@]}" -eq 0 ]; then
  echo "No PNG files in $root/wallpapers (see wallpapers/README.md)." >&2
  exit 1
fi

for file in "${files[@]}"; do
  name="$(basename "$file")"
  echo "→ $bucket/$name"
  npx --yes wrangler@4 r2 object put "$bucket/$name" --file "$file" --content-type image/png --remote
done
