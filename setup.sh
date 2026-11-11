#!/usr/bin/env bash
# PolicyLens one-time setup script
# Run from the repo root: bash setup.sh

set -e

echo "==> Generating extension icons..."
python3 make_icons.py

echo "==> Downloading html2canvas..."
curl -L "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" \
  -o extension/libs/html2canvas.min.js
echo "    html2canvas: $(wc -c < extension/libs/html2canvas.min.js) bytes"

echo "==> Downloading diff-match-patch..."
curl -L "https://cdnjs.cloudflare.com/ajax/libs/diff_match_patch/20121119/diff_match_patch.js" \
  -o extension/libs/diff-match-patch.js
echo "    diff-match-patch: $(wc -c < extension/libs/diff-match-patch.js) bytes"

echo ""
echo "==> Setup complete! Files created:"
find extension/icons extension/libs -type f | sort

echo ""
echo "Next steps:"
echo "  1. cd backend && pip install -r requirements.txt"
echo "  2. cp backend/.env.example backend/.env  (then fill in your API key)"
echo "  3. createdb policylens"
echo "  4. python backend/main.py"
echo "  5. Load extension/ in chrome://extensions (Developer Mode -> Load unpacked)"
