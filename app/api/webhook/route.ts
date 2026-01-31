// app/api/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // ✅ must be the REAL service role key
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  // ✅ Most useful event for subscriptions
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // We only care about subscription checkout
    if (session.mode === "subscription") {
      const userId =
        session.client_reference_id ||
        (session.metadata?.supabase_user_id as string | undefined);

      if (!userId) {
        // This is why stripe trigger tests often don’t insert rows
        console.log("No user id on session -> cannot write subscription row");
        return NextResponse.json({ ok: true });
      }

      const subscriptionId = session.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const priceId = subscription.items.data[0]?.price?.id ?? null;

      const { error } = await supabaseAdmin
        .from("subscriptions")
        .upsert({
          user_id: userId,
          stripe_customer_id: String(subscription.customer),
          stripe_subscription_id: subscription.id,
          price_id: priceId,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "stripe_subscription_id" });

      if (error) console.error("Supabase upsert error:", error);
    }
  }

  return NextResponse.json({ received: true });
}