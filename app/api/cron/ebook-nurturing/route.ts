import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  sendEbookNurturing2,
  sendEbookNurturing3,
  sendEbookNurturing4,
} from "@/lib/notifications/ebook-nurturing-email";

/**
 * Vercel Cron — runs daily at 10:00 UTC (07:00 BRT).
 * Sends nurturing emails to ebook leads based on time since signup:
 *   D+3  → Email 2 (initiative feature)
 *   D+7  → Email 3 (engagement + transparency tip)
 *   D+14 → Email 4 (compendium highlight)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this header automatically for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const results = { email2: 0, email3: 0, email4: 0, errors: 0 };

  // ── Email 2: leads created 3-4 days ago, not yet sent ───────────
  const d3Start = new Date(now);
  d3Start.setDate(d3Start.getDate() - 4);
  const d3End = new Date(now);
  d3End.setDate(d3End.getDate() - 3);

  const { data: leads2 } = await supabase
    .from("ebook_leads")
    .select("id, email")
    .gte("created_at", d3Start.toISOString())
    .lt("created_at", d3End.toISOString())
    .is("nurturing_2_sent_at", null)
    .limit(50);

  for (const lead of leads2 ?? []) {
    const ok = await sendEbookNurturing2({ email: lead.email });
    if (ok) {
      await supabase
        .from("ebook_leads")
        .update({ nurturing_2_sent_at: now.toISOString() })
        .eq("id", lead.id);
      results.email2++;
    } else {
      results.errors++;
    }
  }

  // ── Email 3: leads created 7-8 days ago, not yet sent ───────────
  const d7Start = new Date(now);
  d7Start.setDate(d7Start.getDate() - 8);
  const d7End = new Date(now);
  d7End.setDate(d7End.getDate() - 7);

  const { data: leads3 } = await supabase
    .from("ebook_leads")
    .select("id, email")
    .gte("created_at", d7Start.toISOString())
    .lt("created_at", d7End.toISOString())
    .is("nurturing_3_sent_at", null)
    .limit(50);

  for (const lead of leads3 ?? []) {
    const ok = await sendEbookNurturing3({ email: lead.email });
    if (ok) {
      await supabase
        .from("ebook_leads")
        .update({ nurturing_3_sent_at: now.toISOString() })
        .eq("id", lead.id);
      results.email3++;
    } else {
      results.errors++;
    }
  }

  // ── Email 4: leads created 14-15 days ago, not yet sent ─────────
  const d14Start = new Date(now);
  d14Start.setDate(d14Start.getDate() - 15);
  const d14End = new Date(now);
  d14End.setDate(d14End.getDate() - 14);

  const { data: leads4 } = await supabase
    .from("ebook_leads")
    .select("id, email")
    .gte("created_at", d14Start.toISOString())
    .lt("created_at", d14End.toISOString())
    .is("nurturing_4_sent_at", null)
    .limit(50);

  for (const lead of leads4 ?? []) {
    const ok = await sendEbookNurturing4({ email: lead.email });
    if (ok) {
      await supabase
        .from("ebook_leads")
        .update({ nurturing_4_sent_at: now.toISOString() })
        .eq("id", lead.id);
      results.email4++;
    } else {
      results.errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent: results,
    timestamp: now.toISOString(),
  });
}
