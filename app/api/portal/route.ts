import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion removed
});

export async function POST(req: Request) {
  // 1) Must be logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // 2) Get this user's subscription row (RLS allows it)
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer found for this user. Subscribe first." },
      { status: 400 }
    );
  }

  // 3) Build return URL safely
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const returnUrl = `${origin}/dashboard`;

  // 4) Create Billing Portal session
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portal.url });
}