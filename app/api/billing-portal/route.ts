import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/billing-portal — Create Stripe Customer Portal session.
 * Requires auth + active subscription with stripe_customer_id.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 404 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/app/settings?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    captureError(error, { component: "BillingPortalAPI", action: "createPortalSession", category: "payment" });
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
};

export const POST = withRateLimit(handler, { max: 5, window: "15 m" });
