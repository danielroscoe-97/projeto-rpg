import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { captureError } from "@/lib/errors/capture";

/**
 * POST /api/checkout — Create Stripe Checkout session.
 * Requires auth. Accepts { interval: "month" | "year" }.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const interval = body.interval === "year" ? "year" : "month";

    const priceId =
      interval === "year"
        ? process.env.STRIPE_PRICE_YEARLY
        : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price configuration missing" },
        { status: 500 }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const customerOptions: Record<string, string> = {};
    if (existingSub?.stripe_customer_id) {
      customerOptions.customer = existingSub.stripe_customer_id;
    } else {
      if (!user.email) {
        return NextResponse.json({ error: "Email required for checkout" }, { status: 400 });
      }
      customerOptions.customer_email = user.email;
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...customerOptions,
      success_url: `${origin}/app/checkout/success`,
      cancel_url: `${origin}/app/settings?tab=billing&canceled=true`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    captureError(error, { component: "CheckoutAPI", action: "createSession", category: "payment" });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
