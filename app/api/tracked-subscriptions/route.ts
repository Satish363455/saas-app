// app/api/tracked-subscriptions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CreateTrackedSubPayload = {
  merchant_name: string;
  plan_name?: string | null;
  amount: number;
  currency: string;
  renewal_date: string; // YYYY-MM-DD
  billing_cycle?: string | null;
  status?: "active" | "cancelled" | string;
  notes?: string | null;
};

/**
 * GET: list current user's tracked subscriptions
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

/**
 * POST: create a tracked subscription
 * ✅ Returns { sub: insertedRow }
 * ✅ Handles duplicates as 409 (unique_violation)
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<CreateTrackedSubPayload>;

  const merchant_name = String(body.merchant_name ?? "").trim();
  const plan_name =
    body.plan_name === undefined || body.plan_name === null
      ? null
      : String(body.plan_name).trim() || null;

  const notes =
    body.notes === undefined || body.notes === null
      ? null
      : String(body.notes).trim() || null;

  const amountNum = Number(body.amount);
  const currency = String(body.currency ?? "USD").trim().toUpperCase();
  const renewal_date = String(body.renewal_date ?? "").trim(); // YYYY-MM-DD

  const billing_cycle =
    body.billing_cycle === undefined || body.billing_cycle === null
      ? null
      : String(body.billing_cycle).trim() || null;

  // allow payload to choose status, but default to active
  const status =
    String(body.status ?? "active").trim().toLowerCase() === "cancelled"
      ? "cancelled"
      : "active";

  if (!merchant_name) {
    return NextResponse.json({ error: "merchant_name is required" }, { status: 400 });
  }
  if (!renewal_date) {
    return NextResponse.json({ error: "renewal_date is required" }, { status: 400 });
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const cancelled_at = status === "cancelled" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .insert({
      user_id: user.id,
      merchant_name,
      plan_name,
      amount: amountNum,
      currency,
      renewal_date,
      billing_cycle, // ✅ include if column exists
      status, // ✅ include
      cancelled_at, // ✅ include if column exists
      notes,
    })
    .select("*")
    .single();

  if (error) {
    const code = (error as any).code ?? "";
    const msg = String((error as any).message ?? "").toLowerCase();

    if (code === "23505" || msg.includes("duplicate key")) {
      return NextResponse.json(
        {
          error:
            "Duplicate: you already added this subscription (same merchant, amount, currency, renewal date).",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sub: data });
}

/**
 * PATCH: cancel/reactivate (keeps history)
 * Body: { action: "cancel" | "reactivate" }
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String((body as any).action ?? "").toLowerCase();

  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json(
      { error: "Invalid action. Use { action: 'cancel' } or { action: 'reactivate' }" },
      { status: 400 }
    );
  }

  const update =
    action === "cancel"
      ? { status: "cancelled", cancelled_at: new Date().toISOString() }
      : { status: "active", cancelled_at: null };

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sub: data });
}

/**
 * DELETE: delete by id (must belong to user)
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tracked_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}