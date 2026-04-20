#!/usr/bin/env tsx
/**
 * validate-seo — sanity check canonical + JSON-LD on a handful of sample URLs.
 *
 * Usage:
 *   npm run validate:seo          # checks http://localhost:3000
 *   npm run validate:seo:prod     # checks https://pocketdm.com.br
 *   npx tsx scripts/validate-seo.ts --env=production
 *   npx tsx scripts/validate-seo.ts --base=http://localhost:3001
 *
 * Not a CI gate — manual step after important deploys. Ver docs/seo-workflow.md.
 *
 * Exit 1 on any regression:
 *   - canonical missing or not absolute https://pocketdm.com.br/...
 *   - JSON-LD does not JSON.parse
 *   - Article JSON-LD missing `headline`
 *   - BreadcrumbList missing `itemListElement` / `position` / `name` / `item`
 *   - Any URL-ish field (`url`, `image`, `item`, `logo`, `mainEntityOfPage`) not
 *     starting with https://pocketdm.com.br
 */

const APEX = "https://pocketdm.com.br";
const DEFAULT_LOCAL = "http://localhost:3000";

// Verified 200 OK on 2026-04-20 via curl -sI. Keep in sync.
const SAMPLE_PATHS = [
  "/",
  "/monsters/axe-beak",
  "/spells/fireball",
  "/guias/bestiario-dnd-5e",
  "/blog/como-usar-combat-tracker-dnd-5e",
];

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

type Issue = { path: string; msg: string };
const issues: Issue[] = [];

function parseArgs(argv: string[]): { base: string } {
  const env = argv.find((a) => a.startsWith("--env="))?.split("=")[1];
  const baseFlag = argv.find((a) => a.startsWith("--base="))?.split("=")[1];
  if (baseFlag) return { base: baseFlag };
  if (env === "production" || env === "prod") return { base: APEX };
  return { base: DEFAULT_LOCAL };
}

function extract(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m;
  const re2 = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  while ((m = re2.exec(html)) !== null) out.push(m[1]);
  return out;
}

function checkAbsolute(value: unknown, field: string, path: string): void {
  if (typeof value !== "string") return;
  if (!value.startsWith(APEX)) {
    issues.push({
      path,
      msg: `JSON-LD field "${field}" is not absolute (${value})`,
    });
  }
}

function walkJsonLd(node: unknown, path: string): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  for (const key of ["url", "image", "item", "logo", "mainEntityOfPage"]) {
    if (key in obj) checkAbsolute(obj[key], key, path);
  }
  // recurse
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) v.forEach((el) => walkJsonLd(el, path));
    else if (typeof v === "object") walkJsonLd(v, path);
  }
}

async function checkUrl(base: string, subpath: string): Promise<void> {
  const url = `${base}${subpath}`;
  let html: string;
  let status: number;
  try {
    const res = await fetch(url, { redirect: "follow" });
    status = res.status;
    html = await res.text();
  } catch (err) {
    issues.push({ path: subpath, msg: `fetch failed: ${(err as Error).message}` });
    return;
  }

  if (status !== 200) {
    issues.push({ path: subpath, msg: `HTTP ${status}` });
    return;
  }

  // Canonical
  const canonicals = extract(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
  );
  if (canonicals.length === 0) {
    issues.push({ path: subpath, msg: "missing <link rel=canonical>" });
  } else if (canonicals.length > 1) {
    issues.push({
      path: subpath,
      msg: `multiple canonical tags (${canonicals.length})`,
    });
  } else {
    const canonical = canonicals[0];
    if (!canonical.startsWith(APEX)) {
      issues.push({
        path: subpath,
        msg: `canonical not apex: ${canonical}`,
      });
    }
  }

  // JSON-LD blocks
  const ldBlocks = extract(
    html,
    /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  );

  if (ldBlocks.length === 0) {
    issues.push({ path: subpath, msg: "no <script type=application/ld+json> found" });
    return;
  }

  let hasArticle = false;
  let hasBreadcrumb = false;
  for (const raw of ldBlocks) {
    const trimmed = raw.trim();
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      issues.push({
        path: subpath,
        msg: `JSON-LD parse failed: ${(err as Error).message.slice(0, 80)}`,
      });
      continue;
    }
    walkJsonLd(data, subpath);

    const type = (data as { "@type"?: string | string[] })?.["@type"];
    const types = Array.isArray(type) ? type : [type];

    if (types.includes("Article") || types.includes("NewsArticle") || types.includes("BlogPosting")) {
      hasArticle = true;
      const headline = (data as { headline?: unknown })?.headline;
      if (typeof headline !== "string" || headline.length === 0) {
        issues.push({ path: subpath, msg: "Article JSON-LD missing headline" });
      }
    }

    if (types.includes("BreadcrumbList")) {
      hasBreadcrumb = true;
      const list = (data as { itemListElement?: unknown }).itemListElement;
      if (!Array.isArray(list) || list.length === 0) {
        issues.push({
          path: subpath,
          msg: "BreadcrumbList missing itemListElement",
        });
      } else {
        list.forEach((el, i) => {
          const item = el as Record<string, unknown>;
          if (typeof item.position !== "number")
            issues.push({ path: subpath, msg: `Breadcrumb[${i}] missing position` });
          if (typeof item.name !== "string" || !item.name)
            issues.push({ path: subpath, msg: `Breadcrumb[${i}] missing name` });
          if (typeof item.item !== "string" && typeof (item.item as { "@id"?: string })?.["@id"] !== "string")
            issues.push({ path: subpath, msg: `Breadcrumb[${i}] missing item/item.@id` });
        });
      }
    }
  }

  // Detail pages should have both Article + BreadcrumbList
  const isDetail = /\/(monsters|spells|guias|blog)\//.test(subpath);
  if (isDetail) {
    if (!hasArticle)
      issues.push({ path: subpath, msg: "detail page missing Article JSON-LD" });
    if (!hasBreadcrumb)
      issues.push({ path: subpath, msg: "detail page missing BreadcrumbList" });
  }
}

async function main() {
  const { base } = parseArgs(process.argv);
  console.log(`${BOLD}validate-seo${RESET} base=${base}`);
  console.log(`Checking ${SAMPLE_PATHS.length} URLs...\n`);

  const started = Date.now();
  await Promise.all(SAMPLE_PATHS.map((p) => checkUrl(base, p)));
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  // Group issues by path
  const byPath = new Map<string, string[]>();
  for (const { path, msg } of issues) {
    if (!byPath.has(path)) byPath.set(path, []);
    byPath.get(path)!.push(msg);
  }

  for (const path of SAMPLE_PATHS) {
    const errs = byPath.get(path);
    if (!errs || errs.length === 0) {
      console.log(`${GREEN}✓${RESET} ${path}`);
    } else {
      console.log(`${RED}✗${RESET} ${path}`);
      for (const msg of errs) console.log(`    ${RED}·${RESET} ${msg}`);
    }
  }

  console.log();
  if (issues.length === 0) {
    console.log(`${GREEN}${BOLD}All ${SAMPLE_PATHS.length} URLs passed${RESET} (${elapsed}s)`);
    process.exit(0);
  }
  console.log(
    `${RED}${BOLD}${issues.length} issue(s) across ${byPath.size} URL(s)${RESET} (${elapsed}s)`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`${YELLOW}Unexpected error:${RESET}`, err);
  process.exit(2);
});
