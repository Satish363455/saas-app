import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const merchant_name = String(body.merchant_name ?? body.vendor ?? "").trim();
  const amount = Number(body.amount);
  const currency = String(body.currency ?? "USD").toUpperCase();
  const billing_cycle = String(body.billing_cycle ?? "monthly").toLowerCase();
  const start_date = String(body.start_date ?? "");
  const renewal_date = String(body.renewal_date ?? "");

  if (!merchant_name || !Number.isFinite(amount) || !renewal_date) {
    return NextResponse.json(
      { error: "Missing merchant_name/amount/renewal_date" },
      { status: 400 }
    );
  }

  // (Optional) simple dedupe
  const { data: existing } = await supabase
    .from("tracked_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("merchant_name", merchant_name)
    .eq("currency", currency)
    .eq("renewal_date", renewal_date)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Duplicate subscription" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .insert({
      user_id: user.id,
      merchant_name,
      amount,
      currency,
      billing_cycle,
      start_date: start_date || null,
      renewal_date,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sub: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("tracked_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const patch =
    action === "cancel"
      ? { status: "cancelled", cancelled_at: new Date().toISOString() }
      : { status: "active", cancelled_at: null };

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sub: data });
}