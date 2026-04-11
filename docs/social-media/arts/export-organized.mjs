/**
 * Export social media slides to organized subfolders.
 * Usage: node docs/social-media/arts/export-organized.mjs
 *
 * Creates subfolders like:
 *   exports/01-5-erros-mestre-dicas/
 *   exports/02-monstro-owlbear-srd/
 *   exports/03-initiative-tracker-produto/
 *   exports/04-enquete-classes-comunidade/
 */
import { chromium } from '@playwright/test';
import { readdir, mkdir } from 'fs/promises';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ARTS_DIR = __dirname;
const EXPORTS_DIR = resolve(__dirname, 'exports');
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');

// Map HTML files to organized folder names
const POST_MAP = {
  'post-00-open-beta': { folder: '00-open-beta-produto', order: 0, desc: 'Ja postado' },
  'post-01-5-erros-mestre': { folder: '01-5-erros-mestre-dicas', order: 1, desc: 'Carrossel 5 slides - Dicas de Mesa' },
  'post-02-monstro-owlbear': { folder: '02-monstro-owlbear-srd', order: 2, desc: 'Carrossel 5 slides - Conteudo SRD' },
  'post-03-initiative-tracker': { folder: '03-initiative-tracker-produto', order: 3, desc: 'Post unico - Produto' },
  'post-04-enquete-classes': { folder: '04-enquete-classes-comunidade', order: 4, desc: 'Post unico - Comunidade' },
  'profile-avatar': { folder: 'assets-perfil', order: 99, desc: 'Avatar do perfil' },
  'reel-cover-01': { folder: 'assets-reels', order: 99, desc: 'Cover de reels' },
};

async function exportFile(page, htmlFile, outputDir) {
  const name = basename(htmlFile, '.html');
  const config = POST_MAP[name];
  const folderName = config ? config.folder : name;
  const folderPath = resolve(outputDir, folderName);

  if (!existsSync(folderPath)) {
    await mkdir(folderPath, { recursive: true });
  }

  const filePath = resolve(ARTS_DIR, htmlFile);
  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

  console.log(`\n📄 ${htmlFile}`);
  if (config) console.log(`   ${config.desc}`);
  console.log(`   → ${folderName}/`);

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  // Wait longer for Google Fonts to fully load
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.fonts.ready);

  const slides = await page.$$('.slide, .reel-cover, .thumb, .avatar');

  if (slides.length === 0) {
    console.log(`   ⚠ Nenhum slide encontrado`);
    return 0;
  }

  let count = 0;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const box = await slide.boundingBox();
    if (!box) continue;

    const suffix = slides.length > 1 ? `-slide-${i + 1}` : '';
    const outputPath = resolve(folderPath, `${name}${suffix}.png`);

    await slide.screenshot({ path: outputPath, type: 'png' });
    console.log(`   ✅ ${basename(outputPath)} (${box.width}x${box.height})`);
    count++;
  }

  return count;
}

async function main() {
  console.log('🎨 Pocket DM — Social Media Export (Organizado)\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 2000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Allow file:// access to load SVG assets
  await page.addInitScript(() => {
    // Suppress CORS errors for local file access
  });

  const files = (await readdir(ARTS_DIR))
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`📋 ${files.length} arquivos HTML encontrados\n`);

  if (!existsSync(EXPORTS_DIR)) {
    await mkdir(EXPORTS_DIR, { recursive: true });
  }

  let total = 0;
  for (const file of files) {
    total += await exportFile(page, file, EXPORTS_DIR);
  }

  await browser.close();

  console.log(`\n🎉 Pronto! ${total} PNGs exportados.`);
  console.log(`📁 ${EXPORTS_DIR}\n`);

  // List all folders
  const folders = (await readdir(EXPORTS_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const folder of folders) {
    const folderFiles = (await readdir(resolve(EXPORTS_DIR, folder.name)))
      .filter(f => f.endsWith('.png'));
    console.log(`  📂 ${folder.name}/ (${folderFiles.length} imagens)`);
    for (const f of folderFiles) {
      console.log(`     📸 ${f}`);
    }
  }
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
