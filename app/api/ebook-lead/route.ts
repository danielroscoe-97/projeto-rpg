import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEbookWelcomeEmail } from "@/lib/notifications/ebook-nurturing-email";

export async function POST(req: NextRequest) {
  try {
    const { email, ebook } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const normalizedEmail = email.toLowerCase().trim();

    await supabase.from("ebook_leads").upsert(
      {
        email: normalizedEmail,
        ebook_slug: ebook || "guia-mestre-eficaz",
        created_at: new Date().toISOString(),
      },
      { onConflict: "email,ebook_slug" }
    );

    // Fire-and-forget: send ebook delivery email
    sendEbookWelcomeEmail({ email: normalizedEmail }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
