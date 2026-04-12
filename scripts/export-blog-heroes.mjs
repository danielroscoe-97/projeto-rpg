/**
 * Export blog hero images from the HTML template.
 * Usage: node scripts/export-blog-heroes.mjs
 *
 * Prerequisites: python -m http.server 8899 serving from docs/social-media/arts/
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../public/art/blog/heroes");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  // Clear browser cache
  await context.clearCookies();

  const page = await context.newPage();

  // Navigate to the template
  await page.goto("http://localhost:8899/docs/social-media/arts/blog-hero-visual.html", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Wait for all images to load
  await page.waitForTimeout(4000);

  // Verify all images loaded
  const imageStatus = await page.evaluate(() => {
    const imgs = document.querySelectorAll(".hero-art");
    return Array.from(imgs).map((img) => ({
      src: img.src.split("/").pop(),
      loaded: img.naturalWidth > 0,
      width: img.naturalWidth,
    }));
  });

  const loaded = imageStatus.filter((i) => i.loaded).length;
  const total = imageStatus.length;
  console.log(`Images loaded: ${loaded}/${total}`);

  const failed = imageStatus.filter((i) => !i.loaded);
  if (failed.length > 0) {
    console.warn("Failed to load:", failed.map((f) => f.src).join(", "));
  }

  // Get all hero elements and their labels
  const heroes = await page.evaluate(() => {
    const labels = document.querySelectorAll(".label");
    return Array.from(labels).map((label) => {
      const text = label.textContent.trim();
      const filename = text.replace(".png", "");
      return filename;
    });
  });

  console.log(`Found ${heroes.length} heroes to export`);

  // Screenshot each hero
  const heroElements = await page.locator(".hero").all();

  for (let i = 0; i < heroElements.length; i++) {
    const name = heroes[i];
    const outputPath = path.join(OUTPUT_DIR, `${name}.png`);

    await heroElements[i].screenshot({
      path: outputPath,
      type: "png",
    });

    console.log(`  Exported: ${name}.png`);
  }

  console.log(`\nDone! ${heroElements.length} images exported to ${OUTPUT_DIR}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
