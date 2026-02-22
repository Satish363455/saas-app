// app/api/tracked-subscriptions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_BILLING_CYCLES = new Set([
  "weekly",
  "every_2_weeks",
  "monthly",
  "every_3_months",
  "every_6_months",
  "yearly",
  "custom",
]);

type CustomUnit = "days" | "months" | "years";

export type CreateTrackedSubPayload = {
  merchant_name: string;
  plan_name?: string | null;
  amount: number;
  currency: string;
  renewal_date: string; // YYYY-MM-DD

  billing_cycle?: string | null;

  // ✅ custom interval fields (only when billing_cycle === "custom")
  custom_interval_value?: number | null;
  custom_interval_unit?: CustomUnit | null;

  start_date?: string | null; // YYYY-MM-DD

  remind_days_before?: number | null;

  status?: "active" | "cancelled" | string;
  notes?: string | null;
};

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<CreateTrackedSubPayload>;

  const merchant_name = String(body.merchant_name ?? "").trim();
  const plan_name =
    body.plan_name === undefined || body.plan_name === null
      ? null
      : String(body.plan_name).trim() || null;

  const notes =
    body.notes === undefined || body.notes === null ? null : String(body.notes).trim() || null;

  const amountNum = Number(body.amount);
  const currency = String(body.currency ?? "USD").trim().toUpperCase();

  const renewal_date = String(body.renewal_date ?? "").trim();
  const start_date =
    body.start_date === undefined || body.start_date === null
      ? null
      : String(body.start_date).trim() || null;

  const billing_cycle_raw =
    body.billing_cycle === undefined || body.billing_cycle === null
      ? null
      : String(body.billing_cycle).trim() || null;

  const billing_cycle = billing_cycle_raw ? billing_cycle_raw : null;

  const remind_days_before =
    body.remind_days_before === undefined || body.remind_days_before === null
      ? null
      : Number(body.remind_days_before);

  // status
  const status =
    String(body.status ?? "active").trim().toLowerCase() === "cancelled" ? "cancelled" : "active";
  const cancelled_at = status === "cancelled" ? new Date().toISOString() : null;

  if (!merchant_name) {
    return NextResponse.json({ error: "merchant_name is required" }, { status: 400 });
  }
  if (!renewal_date || !isYMD(renewal_date)) {
    return NextResponse.json({ error: "renewal_date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (start_date && !isYMD(start_date)) {
    return NextResponse.json({ error: "start_date must be YYYY-MM-DD" }, { status: 400 });
  }

  // billing cycle validation
  if (billing_cycle && !ALLOWED_BILLING_CYCLES.has(billing_cycle)) {
    return NextResponse.json(
      { error: `Invalid billing_cycle: ${billing_cycle}` },
      { status: 400 }
    );
  }

  // custom interval validation
  let custom_interval_value: number | null = null;
  let custom_interval_unit: CustomUnit | null = null;

  if (billing_cycle === "custom") {
    custom_interval_value = Number(body.custom_interval_value);
    custom_interval_unit = (body.custom_interval_unit ?? null) as CustomUnit | null;

    if (!Number.isFinite(custom_interval_value) || custom_interval_value <= 0) {
      return NextResponse.json(
        {
          error: "custom_interval_value is required and must be > 0 when billing_cycle is custom",
        },
        { status: 400 }
      );
    }
    if (!custom_interval_unit || !["days", "months", "years"].includes(custom_interval_unit)) {
      return NextResponse.json(
        { error: "custom_interval_unit must be days|months|years when billing_cycle is custom" },
        { status: 400 }
      );
    }
  }

  // remind_days_before validation (optional)
  if (remind_days_before !== null) {
    if (!Number.isFinite(remind_days_before) || remind_days_before < 0) {
      return NextResponse.json(
        { error: "remind_days_before must be a non-negative number" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .insert({
      user_id: user.id,
      merchant_name,
      plan_name,
      amount: amountNum,
      currency,
      renewal_date,
      billing_cycle,
      custom_interval_value,
      custom_interval_unit,
      start_date,
      remind_days_before,
      status,
      cancelled_at,
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

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sub: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("tracked_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}