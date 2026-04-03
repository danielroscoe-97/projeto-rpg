/**
 * generate-google-logo.mjs
 * Generates a 512x512 PNG logo for Google OAuth consent screen
 * Uses sharp to composite the Crown d20 SVG over the brand dark background
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SIZE = 512;
const PADDING = 48; // ~9.4% padding on each side — Google recommends some breathing room
const LOGO_SIZE = SIZE - PADDING * 2; // 416px

const svgRaw = readFileSync(join(root, 'public/art/brand/logo-icon.svg'), 'utf8');

// Re-size the SVG to the inner logo size
const svgResized = svgRaw
  .replace(/viewBox="[^"]*"/, `viewBox="0 0 512 512"`)
  .replace(/<svg([^>]*)>/, `<svg$1 width="${LOGO_SIZE}" height="${LOGO_SIZE}">`);

const svgBuffer = Buffer.from(svgResized);

// 1. Create dark background square
const background = await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 19, g: 19, b: 30, alpha: 1 }, // #13131E
  },
})
  .png()
  .toBuffer();

// 2. Composite logo centered on background
const output = join(root, 'public/art/brand/logo-google-512.png');

await sharp(background)
  .composite([
    {
      input: svgBuffer,
      top: PADDING,
      left: PADDING,
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`✓ Generated: ${output}`);
console.log(`  Size: ${SIZE}x${SIZE}px`);
console.log(`  Logo area: ${LOGO_SIZE}x${LOGO_SIZE}px (${PADDING}px padding)`);
console.log(`  Background: #13131E`);
