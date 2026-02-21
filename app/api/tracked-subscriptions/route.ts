// app/api/tracked-subscriptions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What your UI / client can send
 */
export type CreateTrackedSubPayload = {
  merchant_name: string;
  plan_name?: string | null;
  amount: number;
  currency: string;

  // Either you send renewal_date directly (recommended)
  renewal_date: string; // YYYY-MM-DD

  // Billing
  billing_cycle?: string | null; // weekly | monthly | yearly | custom (or UI text like "Custom interval...")
  custom_interval_value?: number | null; // for custom
  custom_interval_unit?: "days" | "weeks" | "months" | "years" | string | null; // for custom

  // Reminders
  remind_days_before?: number | null;

  // Optional
  status?: "active" | "cancelled" | string;
  notes?: string | null;

  // Optional (if you ever use it)
  start_date?: string | null; // YYYY-MM-DD
};

type BillingCycleNormalized = "weekly" | "monthly" | "yearly" | "custom" | null;

function normalizeBillingCycle(input: string | null | undefined): BillingCycleNormalized {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();

  // Handle common UI labels / values
  if (s.includes("custom")) return "custom";
  if (s === "weekly") return "weekly";
  if (s === "monthly") return "monthly";
  if (s === "yearly" || s === "annual" || s === "annually") return "yearly";

  // If your UI ever sends "custom_interval" etc
  if (s === "custom_interval" || s === "custom interval") return "custom";

  // Unknown -> null (so DB default can apply), but if DB has check constraint, null is allowed.
  return null;
}

function normalizeUnit(input: any): "days" | "weeks" | "months" | "years" | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (s.startsWith("day")) return "days";
  if (s.startsWith("week")) return "weeks";
  if (s.startsWith("month")) return "months";
  if (s.startsWith("year")) return "years";
  return null;
}

function envDefaultRemindDaysBefore() {
  const n = Number(process.env.REMINDER_DAYS_BEFORE);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

/**
 * GET: list current user's tracked subscriptions
 */
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

/**
 * POST: create a tracked subscription
 * ✅ supports billing_cycle: weekly | monthly | yearly | custom
 * ✅ supports custom_interval_value + custom_interval_unit (writes to billing_interval + billing_unit if columns exist)
 * ✅ supports remind_days_before (defaults to REMINDER_DAYS_BEFORE)
 */
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

  const renewal_date = String(body.renewal_date ?? "").trim(); // YYYY-MM-DD
  const start_date = body.start_date ? String(body.start_date).trim() : null;

  const billing_cycle = normalizeBillingCycle(body.billing_cycle ?? null);

  const custom_interval_value =
    body.custom_interval_value === undefined || body.custom_interval_value === null
      ? null
      : Number(body.custom_interval_value);

  const custom_interval_unit = normalizeUnit(body.custom_interval_unit);

  const remind_days_before =
    body.remind_days_before === undefined || body.remind_days_before === null
      ? envDefaultRemindDaysBefore()
      : Number(body.remind_days_before);

  // allow payload to choose status, but default to active
  const status =
    String(body.status ?? "active").trim().toLowerCase() === "cancelled" ? "cancelled" : "active";

  if (!merchant_name) {
    return NextResponse.json({ error: "merchant_name is required" }, { status: 400 });
  }
  if (!renewal_date) {
    return NextResponse.json({ error: "renewal_date is required" }, { status: 400 });
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(remind_days_before) || remind_days_before < 0) {
    return NextResponse.json({ error: "remind_days_before must be >= 0" }, { status: 400 });
  }

  // If custom, require interval fields
  if (billing_cycle === "custom") {
    if (!Number.isFinite(custom_interval_value ?? NaN) || (custom_interval_value ?? 0) <= 0) {
      return NextResponse.json(
        { error: "custom_interval_value is required and must be > 0 when billing_cycle is custom" },
        { status: 400 }
      );
    }
    if (!custom_interval_unit) {
      return NextResponse.json(
        { error: "custom_interval_unit is required when billing_cycle is custom" },
        { status: 400 }
      );
    }
  }

  const cancelled_at = status === "cancelled" ? new Date().toISOString() : null;

  /**
   * IMPORTANT:
   * Your DB has a CHECK constraint like:
   * billing_cycle IN ('weekly','monthly','yearly','custom')
   * So we MUST only insert those values.
   *
   * Also: your DB already has columns billing_interval and billing_unit (seen in your JSON),
   * so we write them for custom cycles.
   */
  const insertPayload: Record<string, any> = {
    user_id: user.id,
    merchant_name,
    plan_name,
    amount: amountNum,
    currency,
    renewal_date,
    status,
    cancelled_at,
    notes,
    remind_days_before,
  };

  // Only add if you want to store it (column exists in your DB per screenshot)
  if (billing_cycle !== null) insertPayload.billing_cycle = billing_cycle;

  // Optional start_date column exists in your JSON (currently null)
  if (start_date) insertPayload.start_date = start_date;

  // Store custom interval details
  if (billing_cycle === "custom") {
    insertPayload.billing_interval = custom_interval_value;
    insertPayload.billing_unit = custom_interval_unit;
  } else {
    // keep clean
    insertPayload.billing_interval = null;
    insertPayload.billing_unit = null;
  }

  const { data, error } = await supabase
    .from("tracked_subscriptions")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    const code = (error as any).code ?? "";
    const msg = String((error as any).message ?? "");

    // Duplicate
    if (code === "23505" || msg.toLowerCase().includes("duplicate key")) {
      return NextResponse.json(
        {
          error:
            "Duplicate: you already added this subscription (same merchant, amount, currency, renewal date).",
        },
        { status: 409 }
      );
    }

    // Check constraint (billing_cycle_check)
    if (code === "23514" || msg.toLowerCase().includes("check constraint")) {
      return NextResponse.json(
        {
          error:
            "Invalid billing_cycle value. Allowed: weekly, monthly, yearly, custom. (Your UI may be sending 'Custom interval...' instead of 'custom')",
          detail: msg,
          got: {
            billing_cycle_raw: body.billing_cycle ?? null,
            billing_cycle_normalized: billing_cycle,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 400 });
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

/**
 * DELETE: delete by id (must belong to user)
 */
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