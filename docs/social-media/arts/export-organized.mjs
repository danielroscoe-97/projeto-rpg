/**
 * Export social media slides to organized subfolders.
 * Usage: node docs/social-media/arts/export-organized.mjs
 *
 * Creates subfolders like:
 *   exports/00-open-beta-produto/
 *   exports/01-5-erros-mestre-dicas/
 *   exports/02-monstro-owlbear-srd/
 *   exports/03-initiative-tracker-produto/
 *   exports/04-enquete-classes-comunidade/
 *   exports/05-monstro-ancient-red-dragon-srd/
 *   exports/06-monstro-tarrasque-srd/
 *   ... (21 monstros no total, 05-25)
 *   exports/25-monstro-oni-srd/
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
  'post-02-monstro-owlbear': { folder: '02-monstro-owlbear-srd', order: 2, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-03-initiative-tracker': { folder: '03-initiative-tracker-produto', order: 3, desc: 'Post unico - Produto' },
  'post-04-enquete-classes': { folder: '04-enquete-classes-comunidade', order: 4, desc: 'Post unico - Comunidade' },
  // Monstro da Semana — Tier S
  'post-03-monstro-ancient-red-dragon': { folder: '05-monstro-ancient-red-dragon-srd', order: 5, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-04-monstro-tarrasque': { folder: '06-monstro-tarrasque-srd', order: 6, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-05-monstro-lich': { folder: '07-monstro-lich-srd', order: 7, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-06-monstro-mimic': { folder: '08-monstro-mimic-srd', order: 8, desc: 'Carrossel 6 slides - Conteudo SRD' },
  // Monstro da Semana — Tier A
  'post-07-monstro-kraken': { folder: '09-monstro-kraken-srd', order: 9, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-08-monstro-hydra': { folder: '10-monstro-hydra-srd', order: 10, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-09-monstro-chimera': { folder: '11-monstro-chimera-srd', order: 11, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-10-monstro-medusa': { folder: '12-monstro-medusa-srd', order: 12, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-11-monstro-minotaur': { folder: '13-monstro-minotaur-srd', order: 13, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-12-monstro-vampire': { folder: '14-monstro-vampire-srd', order: 14, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-13-monstro-werewolf': { folder: '15-monstro-werewolf-srd', order: 15, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-14-monstro-death-knight': { folder: '16-monstro-death-knight-srd', order: 16, desc: 'Carrossel 6 slides - Conteudo SRD' },
  // Monstro da Semana — Tier B
  'post-15-monstro-goblin': { folder: '17-monstro-goblin-srd', order: 17, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-16-monstro-skeleton': { folder: '18-monstro-skeleton-srd', order: 18, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-17-monstro-zombie': { folder: '19-monstro-zombie-srd', order: 19, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-18-monstro-troll': { folder: '20-monstro-troll-srd', order: 20, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-19-monstro-rust-monster': { folder: '21-monstro-rust-monster-srd', order: 21, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-20-monstro-gelatinous-cube': { folder: '22-monstro-gelatinous-cube-srd', order: 22, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-21-monstro-flameskull': { folder: '23-monstro-flameskull-srd', order: 23, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-22-monstro-doppelganger': { folder: '24-monstro-doppelganger-srd', order: 24, desc: 'Carrossel 6 slides - Conteudo SRD' },
  'post-23-monstro-oni': { folder: '25-monstro-oni-srd', order: 25, desc: 'Carrossel 6 slides - Conteudo SRD' },
  // Assets
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
