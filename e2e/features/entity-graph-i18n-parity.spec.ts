import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — i18n parity guard for PT-BR + EN (AC-3b-10, AC-REG-03).
 *
 * Covers two coverage-gap ACs at once by navigating entity-graph surfaces in
 * BOTH locales and observing:
 *
 *  1. AC-3b-10 — "Zero chave MISSING_MESSAGE nos dois locales":
 *     next-intl's `defaultGetMessageFallback` returns the literal
 *     `namespace.key` when a key is missing AND `defaultOnError` emits an
 *     `IntlError` with `code: "MISSING_MESSAGE"` to the console. We listen
 *     on `page.on("pageerror")` + `page.on("console")` and assert neither
 *     fires during a happy-path tour. We also spot-check the rendered DOM
 *     for raw i18n path patterns (`locations.` / `entity_graph.` visible as
 *     text is a strong tell).
 *
 *  2. AC-REG-03 — "CampaignMindMap.tsx continua renderizando edges existentes
 *     (mesma tabela)": seed 2 edges in `campaign_mind_map_edges` (the legacy
 *     pre-Entity-Graph table that the Entity Graph work intentionally did NOT
 *     replace), open the mindmap tab, and assert the ReactFlow surface renders
 *     two edge DOM nodes. Confirms the shared-storage promise of the migration
 *     wave (mig 148 only extended the CHECK constraint, didn't move edges
 *     elsewhere).
 *
 * Setup:
 *   - Service-role seeds a throwaway campaign owned by the logged-in DM with
 *     2 locations + 1 edge between them (+1 extra edge via a 2nd location).
 *     Edges use `relationship = 'linked_to'` — a pre-existing relationship
 *     predating the Entity Graph epic. Keeps the assertion semantically tight
 *     for REG-03.
 *   - Browser logs in as DM (needs NEXT_PUBLIC_E2E_MODE=true for window bridge).
 *   - afterAll cascades the campaign delete.
 *
 * If the bridge is absent, every test skips — consistent with peer specs.
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  locA: string | null;
  locB: string | null;
  locC: string | null;
  skipReason: string | null;
}

const ROUTES_TO_COVER: ReadonlyArray<{
  locale: "pt-BR" | "en";
  section: "locations" | "npcs" | "factions" | "mindmap" | "notes";
}> = [
  { locale: "pt-BR", section: "locations" },
  { locale: "pt-BR", section: "npcs" },
  { locale: "pt-BR", section: "factions" },
  { locale: "pt-BR", section: "mindmap" },
  { locale: "pt-BR", section: "notes" },
  { locale: "en", section: "locations" },
  { locale: "en", section: "npcs" },
  { locale: "en", section: "factions" },
  { locale: "en", section: "mindmap" },
  { locale: "en", section: "notes" },
];

async function getLoggedInUserId(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const bridge = (
      window as unknown as {
        __pocketdm_supabase?: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } };
      }
    ).__pocketdm_supabase;
    if (!bridge) return null;
    const { data } = await bridge.auth.getUser();
    return data.user?.id ?? null;
  });
}

async function seedFixture(userId: string): Promise<{
  campaignId: string;
  locA: string;
  locB: string;
  locC: string;
}> {
  const sb = getServiceClient();
  const { data: camp, error: ce } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E i18n+REG-03 ${Date.now()}` })
    .select("id")
    .single();
  if (ce || !camp) throw new Error(`Campaign seed failed: ${ce?.message}`);

  const { data: locs, error: le } = await sb
    .from("campaign_locations")
    .insert([
      { campaign_id: camp.id, name: "Alpha", location_type: "region" },
      { campaign_id: camp.id, name: "Beta", location_type: "city" },
      { campaign_id: camp.id, name: "Gamma", location_type: "building" },
    ])
    .select("id, name");
  if (le || !locs || locs.length !== 3) throw new Error(`Locations seed failed: ${le?.message}`);
  const locA = locs.find((l) => l.name === "Alpha")!.id;
  const locB = locs.find((l) => l.name === "Beta")!.id;
  const locC = locs.find((l) => l.name === "Gamma")!.id;

  // Two pre-existing edges in the legacy table — relationship types that
  // predate the Entity Graph epic (mig 080 set). If REG-03 breaks, these
  // would stop rendering on the mindmap.
  const { error: ee } = await sb.from("campaign_mind_map_edges").insert([
    {
      campaign_id: camp.id,
      source_type: "location",
      source_id: locA,
      target_type: "location",
      target_id: locB,
      relationship: "linked_to",
      created_by: userId,
    },
    {
      campaign_id: camp.id,
      source_type: "location",
      source_id: locB,
      target_type: "location",
      target_id: locC,
      relationship: "leads_to",
      created_by: userId,
    },
  ]);
  if (ee) throw new Error(`Edges seed failed: ${ee.message}`);

  return { campaignId: camp.id, locA, locB, locC };
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

async function setLocaleCookie(page: Page, locale: "pt-BR" | "en"): Promise<void> {
  // next-intl reads NEXT_LOCALE from cookies (see i18n/request.ts). Setting
  // it via page.context so subsequent navigations pick it up for SSR.
  const url = new URL(page.url() || "http://localhost:3000");
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: locale,
      domain: url.hostname,
      path: "/",
      sameSite: "Lax",
    },
  ]);
}

test.describe("P1 — Entity Graph: i18n parity & REG-03", () => {
  test.setTimeout(180_000);

  const state: SetupState = {
    campaignId: null,
    userId: null,
    locA: null,
    locB: null,
    locC: null,
    skipReason: null,
  };

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const userId = await getLoggedInUserId(page);
      if (!userId) {
        state.skipReason =
          "No Supabase session bridge (window.__pocketdm_supabase). Set NEXT_PUBLIC_E2E_MODE=true.";
        return;
      }
      state.userId = userId;
      const seed = await seedFixture(userId);
      state.campaignId = seed.campaignId;
      state.locA = seed.locA;
      state.locB = seed.locB;
      state.locC = seed.locC;
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  test("AC-3b-10: zero MISSING_MESSAGE across entity-graph surfaces in PT-BR + EN", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const intlProblems: string[] = [];
    page.on("console", (msg: ConsoleMessage) => {
      const text = msg.text();
      if (/MISSING_MESSAGE|IntlError.*MISSING/i.test(text)) {
        intlProblems.push(`[console.${msg.type()}] ${text}`);
      }
    });
    page.on("pageerror", (err) => {
      if (/MISSING_MESSAGE/i.test(err.message)) {
        intlProblems.push(`[pageerror] ${err.message}`);
      }
    });

    try {
      await loginAsDM(page);
      for (const { locale, section } of ROUTES_TO_COVER) {
        await setLocaleCookie(page, locale);
        const url = `/app/campaigns/${state.campaignId}?section=${section}`;
        await page.goto(url);
        await page.waitForLoadState("domcontentloaded");
        // Give client components a tick to mount and emit any i18n errors.
        await page.waitForTimeout(1200);

        // DOM safety net: defaultGetMessageFallback joins namespace+key with a
        // dot, so stray `locations.something` / `factions.something` text is
        // a strong signal of a missing key reaching the user. Empty <body>
        // escape: only assert on text long enough to be meaningful.
        const bodyText = (await page.locator("body").innerText()).slice(0, 50_000);
        const rawKeyHits = bodyText.match(
          /\b(locations|factions|entity_graph|mindmap|npcs|notes|quests)\.[a-z_][a-zA-Z0-9_]*\b/g,
        );
        // Some analytics / debug payloads can include keys as JSON in comments;
        // trust the signal only when there are many hits OR a specific known
        // prefix pattern shows up repeatedly. Treat any hit as a finding for
        // this narrow AC — the failure message surfaces the exact string.
        if (rawKeyHits && rawKeyHits.length > 0) {
          intlProblems.push(
            `[${locale} /${section}] raw i18n key leaked into DOM: ${rawKeyHits.slice(0, 5).join(", ")}`,
          );
        }
      }
    } finally {
      await ctx.close();
    }

    expect(
      intlProblems,
      `i18n parity gate failed — MISSING_MESSAGE or raw keys surfaced:\n  ${intlProblems.join("\n  ")}`,
    ).toEqual([]);
  });

  test("AC-REG-03: CampaignMindMap renders pre-existing edges (same table, untouched by Entity Graph)", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=mindmap`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector(".react-flow", { timeout: 15_000 });
      await page.waitForSelector(".react-flow__node", { timeout: 15_000 });
      // Layout + edge routing settle. ReactFlow renders edges into
      // .react-flow__edge on initial mount — no focus interaction needed.
      await page.waitForTimeout(1800);

      const nodeCount = await page.locator(".react-flow__node").count();
      expect(
        nodeCount,
        "ReactFlow must render at least 3 nodes (Alpha, Beta, Gamma locations)",
      ).toBeGreaterThanOrEqual(3);

      const edgeCount = await page.locator(".react-flow__edge").count();
      expect(
        edgeCount,
        "CampaignMindMap must render the 2 pre-existing edges (linked_to + leads_to). " +
          `If this drops to 0, REG-03 broke — Entity Graph moved edges out of campaign_mind_map_edges.`,
      ).toBeGreaterThanOrEqual(2);
    } finally {
      await ctx.close();
    }
  });
});
