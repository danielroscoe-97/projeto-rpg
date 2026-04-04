/**
 * Phase 2: Add gold glow effect using sharp (CJS to avoid ESM dlopen issues).
 * Runs in its own process to avoid native module conflicts.
 */

const sharp = require("sharp");
const { readFile, writeFile, unlink } = require("node:fs/promises");

const [,, input, output] = process.argv;

const MAX_WIDTH = 800;
const GLOW_PADDING = 80;
const GOLD = { r: 212, g: 168, b: 83 };

async function run() {
  const src = await readFile(input);

  // Resize to web-appropriate width
  const resized = await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const w = meta.width;
  const h = meta.height;
  console.log(`📐 Resized to ${w}x${h}`);

  // Create padded canvas so glow has room to spread
  const canvasW = w + GLOW_PADDING * 2;
  const canvasH = h + GLOW_PADDING * 2;

  const padded = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left: GLOW_PADDING, top: GLOW_PADDING }])
    .png()
    .toBuffer();

  // Create gold silhouette (tint preserves alpha, changes RGB to gold)
  const goldSilhouette = await sharp(padded)
    .tint(GOLD)
    .png()
    .toBuffer();

  // Wide glow: large blur, subtle
  const glowWide = await sharp(goldSilhouette)
    .blur(37) // must be odd
    .modulate({ brightness: 1.2 })
    .png()
    .toBuffer();

  // Tight glow: small blur, brighter halo
  const glowTight = await sharp(goldSilhouette)
    .blur(19) // must be odd
    .modulate({ brightness: 1.6 })
    .png()
    .toBuffer();

  // Composite: wide glow → tight glow → original character
  const final = await sharp(glowWide)
    .composite([
      { input: glowTight, blend: "screen" },
      { input: padded, blend: "over" },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(output, final);

  // Clean up intermediate file
  await unlink(input).catch(() => {});

  const sizeMB = (final.length / 1024 / 1024).toFixed(2);
  console.log(`✅ Gold glow applied → ${output} (${sizeMB} MB)`);
}

run().catch(e => { console.error(e); process.exit(1); });
