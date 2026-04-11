/**
 * Fetch monster art from 5etools-img mirror for social media posts.
 * Usage: node docs/social-media/arts/fetch-monster-art.mjs "Owlbear" "MM"
 *        node docs/social-media/arts/fetch-monster-art.mjs "Adult Red Dragon" "MM"
 *
 * Args:
 *   1: Monster name (exact, case-sensitive as in 5etools)
 *   2: Source book abbreviation (MM, VGM, MPMM, etc.) - default: MM
 *
 * Downloads both full illustration and token to docs/social-media/arts/assets/
 */
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ASSETS_DIR = resolve(__dirname, 'assets');
const BASE_URL = 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary';

function slugify(name) {
  return name
    .replace(/['"]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c');
}

function fileSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const monsterName = process.argv[2];
  const source = process.argv[3] || 'MM';

  if (!monsterName) {
    console.error('Usage: node fetch-monster-art.mjs "Monster Name" [SOURCE]');
    console.error('Example: node fetch-monster-art.mjs "Owlbear" MM');
    process.exit(1);
  }

  if (!existsSync(ASSETS_DIR)) {
    await mkdir(ASSETS_DIR, { recursive: true });
  }

  const encodedName = slugify(monsterName).replace(/ /g, '%20');
  const slug = fileSlug(monsterName);

  console.log(`\nFetching art for: ${monsterName} (${source})`);
  console.log(`Slug: ${slug}\n`);

  // Full illustration
  const fullUrl = `${BASE_URL}/${source}/${encodedName}.webp`;
  console.log(`Full: ${fullUrl}`);
  const fullData = await fetchImage(fullUrl);

  if (fullData) {
    const sharp = (await import('sharp')).default;
    const fullPath = resolve(ASSETS_DIR, `${slug}.png`);
    await sharp(fullData).png().toFile(fullPath);
    const meta = await sharp(fullPath).metadata();
    console.log(`  Saved: ${slug}.png (${meta.width}x${meta.height})`);
  } else {
    console.log('  Not found');
  }

  // Token
  const tokenUrl = `${BASE_URL}/tokens/${source}/${encodedName}.webp`;
  console.log(`Token: ${tokenUrl}`);
  const tokenData = await fetchImage(tokenUrl);

  if (tokenData) {
    const sharp = (await import('sharp')).default;
    const tokenPath = resolve(ASSETS_DIR, `${slug}-token.png`);
    await sharp(tokenData).png().toFile(tokenPath);
    const meta = await sharp(tokenPath).metadata();
    console.log(`  Saved: ${slug}-token.png (${meta.width}x${meta.height})`);
  } else {
    console.log('  Not found');
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
