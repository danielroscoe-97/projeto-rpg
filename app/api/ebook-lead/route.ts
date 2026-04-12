import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, ebook } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    const supabase = createServiceClient();

    await supabase.from("ebook_leads").upsert(
      {
        email: email.toLowerCase().trim(),
        ebook_slug: ebook || "guia-mestre-eficaz",
        created_at: new Date().toISOString(),
      },
      { onConflict: "email,ebook_slug" }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
