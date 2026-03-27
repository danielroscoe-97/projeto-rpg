import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import { captureError } from "@/lib/errors/capture";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe — Stripe webhook handler.
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 * Signature validated via STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    captureError(err, { component: "StripeWebhook", action: "verifySignature", category: "payment" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          Sentry.captureMessage("Stripe checkout.session.completed missing user_id metadata", {
            extra: { session_id: session.id },
          });
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Get subscription details from Stripe
        const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
        // In Stripe v21+, current_period_end is on the item level
        const firstItem = stripeSub.items?.data?.[0];
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : null;

        // Upsert subscription record
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existing) {
          await supabase
            .from("subscriptions")
            .update({
              plan: "pro",
              status: "active",
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              current_period_end: periodEnd,
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan: "pro",
              status: "active",
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              current_period_end: periodEnd,
            });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        const updatedStatus = mapStripeStatus(subscription.status);
        const updatedItem = subscription.items?.data?.[0];
        const updatedPeriodEnd = updatedItem?.current_period_end
          ? new Date(updatedItem.current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from("subscriptions")
          .update({
            status: updatedStatus,
            current_period_end: updatedPeriodEnd,
          })
          .eq("user_id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        // Grace period: keep Pro features until period end
        const periodEnd = subscription.items?.data?.[0]?.current_period_end;
        const periodEndDate = periodEnd ? new Date(periodEnd * 1000) : null;
        const isStillActive = periodEndDate && periodEndDate > new Date();

        if (isStillActive) {
          // Grace period — keep pro until period ends
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              plan: "pro",
              cancel_at_period_end: true,
              current_period_end: periodEndDate.toISOString(),
            })
            .eq("user_id", userId);
        } else {
          // Period already ended — downgrade immediately
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              plan: "free",
              cancel_at_period_end: false,
            })
            .eq("user_id", userId);
        }
        break;
      }
    }
  } catch (error) {
    captureError(error, { component: "StripeWebhook", action: "processEvent", category: "payment" });
    // Return 500 so Stripe retries (up to 72h with exponential backoff)
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "past_due";
  }
}
