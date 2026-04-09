/**
 * Export social media slides from HTML to PNG.
 * Usage: node docs/social-media/arts/export-slides.mjs
 *
 * Requires: @playwright/test (already in devDependencies)
 */
import { chromium } from '@playwright/test';
import { readdir } from 'fs/promises';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ARTS_DIR = __dirname;
const EXPORTS_DIR = resolve(__dirname, 'exports');

async function exportFile(page, htmlFile) {
  const name = basename(htmlFile, '.html');
  const filePath = resolve(ARTS_DIR, htmlFile);
  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

  console.log(`\n📄 Processing: ${htmlFile}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Wait for Google Fonts to load
  await page.waitForTimeout(2000);

  // Find all .slide and .reel-cover and .thumb elements
  const slides = await page.$$('.slide, .reel-cover, .thumb, .avatar');

  if (slides.length === 0) {
    console.log(`  ⚠️  No slides found in ${htmlFile}`);
    return;
  }

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const box = await slide.boundingBox();
    if (!box) continue;

    const suffix = slides.length > 1 ? `-slide-${i + 1}` : '';
    const outputPath = resolve(EXPORTS_DIR, `${name}${suffix}.png`);

    await slide.screenshot({
      path: outputPath,
      type: 'png',
    });

    console.log(`  ✅ Exported: ${basename(outputPath)} (${box.width}x${box.height})`);
  }
}

async function main() {
  console.log('🎨 Pocket DM — Social Media Slide Exporter\n');
  console.log(`📁 Source: ${ARTS_DIR}`);
  console.log(`📁 Output: ${EXPORTS_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 2000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Get all HTML files (exclude export script)
  const files = (await readdir(ARTS_DIR))
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`\n📋 Found ${files.length} HTML files to export`);

  for (const file of files) {
    await exportFile(page, file);
  }

  await browser.close();

  // Count exported files
  const exported = (await readdir(EXPORTS_DIR)).filter(f => f.endsWith('.png'));
  console.log(`\n🎉 Done! ${exported.length} PNGs exported to exports/`);
  console.log('\nFiles:');
  for (const f of exported.sort()) {
    console.log(`  📸 ${f}`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
