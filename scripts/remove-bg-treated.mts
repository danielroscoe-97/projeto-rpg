/**
 * Remove dark navy background from treated character PNGs.
 * Creates transparent copies in public/art/blog/treated-nobg/
 *
 * Strategy: The backgrounds are consistently dark navy (#1a1a2e-ish).
 * We extract raw pixels, compute distance from the navy hue, and set
 * alpha to 0 for pixels that are close to the background color.
 * Edge pixels get gradual alpha for smoother blending.
 */
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const SRC_DIR = "public/art/blog/treated";
const OUT_DIR = "public/art/blog/treated-nobg";

// Only process the 13 images we're actually using
const TARGET_FILES = [
  "dnd-character-gnome-male-artificer-in-a-workshop.png",
  "dnd-character-human-blood-hunter-with-red-eyes-and-long-hair.png",
  "dnd-character-githyanki-female-warrior.png",
  "mythjourneys-dnd-character-dwarf-male-fighter-paladin.png",
  "mythjourneys-dnd-character-dragonborn-male-fighter.png",
  "mythjourneys-anubis-god-of-the-dead.png",
  "dnd-elf-wizard-sorcerer-mythjourneys.png",
  "mythjourneys-dnd-character-dragonborn-male-bard.png",
  "mythjourneys-dnd-character-dark-elf-female-wizard-sorcerer.png",
  "mythjourneys-a-beautiful-blond-valkyrie-in-armor.png",
  "dnd-character-human-female-barbarian-with-an-angry-look.png",
  "dnd-character-dwarf-male-cleric-in-heavy-shiny-armor.png",
  "dnd-character-elf-fighter-wearing-heavy-armor-in-the-forest.png",
];

/** How close a pixel must be to the bg color to be removed (0-255 scale) */
const THRESHOLD = 55;
/** Soft edge range — pixels within this distance get gradual transparency */
const SOFT_EDGE = 25;

async function removeBg(filename: string) {
  const srcPath = join(SRC_DIR, filename);
  const outPath = join(OUT_DIR, filename);

  const image = sharp(srcPath);
  const { width, height } = await image.metadata();
  if (!width || !height) return;

  // Extract raw RGBA pixels
  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);

  // Sample corners to detect the actual background color
  const samplePositions = [
    0, // top-left
    (width - 1) * 4, // top-right
    (height - 1) * width * 4, // bottom-left
    ((height - 1) * width + (width - 1)) * 4, // bottom-right
    Math.floor(width / 2) * 4, // top-center
    ((height - 1) * width + Math.floor(width / 2)) * 4, // bottom-center
  ];

  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  for (const pos of samplePositions) {
    bgR += pixels[pos];
    bgG += pixels[pos + 1];
    bgB += pixels[pos + 2];
    count++;
  }
  bgR = Math.round(bgR / count);
  bgG = Math.round(bgG / count);
  bgB = Math.round(bgB / count);

  console.log(`  BG color detected: rgb(${bgR}, ${bgG}, ${bgB})`);

  // Process each pixel
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Euclidean distance from background color
    const dist = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );

    if (dist < THRESHOLD) {
      // Fully transparent — this is background
      pixels[i + 3] = 0;
    } else if (dist < THRESHOLD + SOFT_EDGE) {
      // Soft edge — gradual alpha
      const alpha = Math.round(
        ((dist - THRESHOLD) / SOFT_EDGE) * pixels[i + 3]
      );
      pixels[i + 3] = alpha;
    }
    // else: keep original alpha
  }

  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outPath);

  console.log(`  ✓ ${filename}`);
}

async function main() {
  console.log(`Removing backgrounds from ${TARGET_FILES.length} images...\n`);

  for (const file of TARGET_FILES) {
    try {
      await removeBg(file);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err}`);
    }
  }

  console.log("\nDone! Output in:", OUT_DIR);
}

main();
