// app/api/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${err?.message ?? String(err)}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription") {
        const userId =
          session.client_reference_id ||
          (session.metadata?.supabase_user_id as string | undefined);

        if (!userId) {
          console.log("No user id on session -> cannot write subscription row");
          return NextResponse.json({ ok: true });
        }

        const subscriptionId = session.subscription as string | null;
        if (!subscriptionId) {
          console.log("No subscription id on session -> cannot write subscription row");
          return NextResponse.json({ ok: true });
        }

        // ✅ Use `any` because your Stripe TS types don't expose current_period_end
        const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);

        const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;

        const currentPeriodEndUnix = subscription?.current_period_end; // seconds
        const currentPeriodEndISO =
          typeof currentPeriodEndUnix === "number"
            ? new Date(currentPeriodEndUnix * 1000).toISOString()
            : null;

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: String(subscription.customer ?? ""),
              stripe_subscription_id: String(subscription.id ?? subscriptionId),
              price_id: priceId,
              status: String(subscription.status ?? "active"),
              current_period_end: currentPeriodEndISO,
            },
            { onConflict: "stripe_subscription_id" }
          );

        if (error) console.error("Supabase upsert error:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Webhook handler failed" },
      { status: 500 }
    );
  }
}