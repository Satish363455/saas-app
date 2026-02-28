// app/api/cron/reminders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";
import { parseLocalYMD } from "@/lib/date"; // you already have this

export const runtime = "nodejs";

const REMIND_DAYS = 3;

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntilLocal(target: Date) {
  const today = startOfDayLocal(new Date());
  const t = startOfDayLocal(target);
  // Math.round is stable when both are start-of-day local
  return Math.round((t.getTime() - today.getTime()) / 86400000);
}

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseNextDateSafe(next: unknown): Date | null {
  if (!next) return null;
  const s = String(next);

  // If the engine returns "YYYY-MM-DD", parse as LOCAL to avoid UTC shift
  if (isYMD(s)) {
    const d = parseLocalYMD(s);
    return Number.isNaN(d.getTime()) ? null : startOfDayLocal(d);
  }

  // Otherwise parse as normal ISO/timestamp
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDayLocal(d);
}

function getAuthSecret(req: Request) {
  const url = new URL(req.url);

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : "";

  const querySecret = url.searchParams.get("secret")?.trim() || "";
  return bearer || querySecret;
}

// ✅ Replace with your real email sender
async function sendReminderEmail(sub: any, nextYMD: string) {
  // Example placeholder:
  // await resend.emails.send({ ... })
  console.log("SEND REMINDER:", sub.id, sub.merchant_name, "next:", nextYMD);
}

export async function GET(req: Request) {
  // ✅ Step 3: Protect it
  const secret = getAuthSecret(req);
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Cron must use service role (no user cookies/session)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json(
      { error: "Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Pull only fields you need (faster)
  const { data: subs, error } = await supabase
    .from("tracked_subscriptions")
    .select(
      "id,user_id,merchant_name,plan_name,amount,currency,renewal_date,billing_cycle,status,cancelled_at,last_reminded_renewal_date"
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let sent = 0;
  let skippedAlready = 0;

  for (const s of subs ?? []) {
    checked++;

    const status = String(s.status ?? "active").toLowerCase();
    const isCancelled = status === "cancelled" || !!s.cancelled_at;
    if (isCancelled) continue;

    // Compute effective next renewal
    const next = effectiveNextRenewal({
      renewalDate: s.renewal_date,
      billingCycle: s.billing_cycle,
      cancelled: false,
    });

    if (!next) continue;

    const nextDate = parseNextDateSafe(next);
    if (!nextDate) continue;

    const diff = daysUntilLocal(nextDate);

    // ✅ ONLY exactly 3 days before
    if (diff !== REMIND_DAYS) continue;

    // ✅ Normalize key we store as YYYY-MM-DD
    const nextYMD = isYMD(String(next))
      ? String(next)
      : nextDate.toISOString().slice(0, 10); // safe because nextDate is local midnight

    // ✅ ONLY ONCE per renewal date
    if (String(s.last_reminded_renewal_date ?? "") === nextYMD) {
      skippedAlready++;
      continue;
    }

    // 🔔 SEND EMAIL HERE
    await sendReminderEmail(s, nextYMD);

    // ✅ Mark as reminded for THIS renewal date
    await supabase
      .from("tracked_subscriptions")
      .update({ last_reminded_renewal_date: nextYMD })
      .eq("id", s.id);

    sent++;
  }

  return NextResponse.json({ ok: true, checked, sent, skippedAlready });
}