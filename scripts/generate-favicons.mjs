/**
 * Generate favicon.ico + small PNG icons from the 512px brand icon.
 * Run: node scripts/generate-favicons.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "public/icons/icon-512.png");

async function generatePngs() {
  const sizes = [16, 32, 48, 96];
  for (const size of sizes) {
    const out = join(root, `public/icons/icon-${size}.png`);
    await sharp(source)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ icon-${size}.png`);
  }
}

/**
 * Build a minimal ICO file containing 16×16, 32×32 and 48×48 PNG entries.
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
async function generateIco() {
  const entries = [];
  for (const size of [16, 32, 48]) {
    const buf = await sharp(source)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();
    entries.push({ size, data: buf });
  }

  // ICO header: 6 bytes
  const headerSize = 6;
  const dirEntrySize = 16; // per image
  const dirSize = dirEntrySize * entries.length;
  let offset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(entries.length, 4);

  const dirEntries = [];
  for (const entry of entries) {
    const dir = Buffer.alloc(dirEntrySize);
    dir.writeUInt8(entry.size < 256 ? entry.size : 0, 0); // width
    dir.writeUInt8(entry.size < 256 ? entry.size : 0, 1); // height
    dir.writeUInt8(0, 2);  // color palette
    dir.writeUInt8(0, 3);  // reserved
    dir.writeUInt16LE(1, 4);  // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(entry.data.length, 8); // data size
    dir.writeUInt32LE(offset, 12); // data offset
    dirEntries.push(dir);
    offset += entry.data.length;
  }

  const ico = Buffer.concat([
    header,
    ...dirEntries,
    ...entries.map((e) => e.data),
  ]);

  // Write to app/favicon.ico (Next.js convention) AND public/favicon.ico (fallback)
  writeFileSync(join(root, "app/favicon.ico"), ico);
  writeFileSync(join(root, "public/favicon.ico"), ico);
  console.log(`✓ favicon.ico (${ico.length} bytes) → app/ + public/`);
}

await generatePngs();
await generateIco();
console.log("\nDone! All favicons generated.");
