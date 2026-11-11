// Run with: node scripts/export-icons.js
// Requires: npm install --save-dev sharp@0.33.4
const sharp = require('sharp');
const path = require('path');
const sizes = [16, 32, 48, 128];
const src = path.join(__dirname, '..', 'extension', 'icons', 'icon.svg');

for (const s of sizes) {
  sharp(src)
    .resize(s, s)
    .png()
    .toFile(path.join(__dirname, '..', 'extension', 'icons', `icon${s}.png`))
    .then(() => console.log(`icon${s}.png done`))
    .catch(err => console.error(`icon${s}.png failed:`, err));
}
