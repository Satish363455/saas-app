// app/api/reminders/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { parseLocalYMD } from "@/lib/date";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const REMIND_DAYS = 3;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntil(ymd: string) {
  const target = startOfDay(parseLocalYMD(ymd));
  const today = startOfDay(new Date());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(ymd: string) {
  return parseLocalYMD(ymd).toLocaleDateString("en-US");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const debug = searchParams.get("debug") === "1";

  if (!secret || secret !== process.env.CRON_SECRET) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: subs } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .neq("status", "cancelled");

  let due = 0;
  let sent = 0;
  const results: any[] = [];

  for (const s of subs ?? []) {
    const renewalYMD = String(s.renewal_date ?? "").slice(0, 10);
    if (!renewalYMD) continue;

    const diff = daysUntil(renewalYMD);

    // ✅ EXACTLY 3 DAYS BEFORE
    if (diff !== REMIND_DAYS) continue;
    due++;

    // ✅ Skip if already reminded
    if (s.last_reminded_renewal_date === renewalYMD) {
      results.push({ id: s.id, skipped: "already_reminded" });
      continue;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", s.user_id)
      .single();

    if (!profile?.email) {
      results.push({ id: s.id, skipped: "no_email" });
      continue;
    }

    // 🔒 LOCK (atomic update)
    const { data: locked } = await supabase
      .from("tracked_subscriptions")
      .update({ last_reminded_renewal_date: renewalYMD })
      .eq("id", s.id)
      .neq("last_reminded_renewal_date", renewalYMD)
      .select("id")
      .maybeSingle();

    if (!locked) {
      results.push({ id: s.id, skipped: "already_locked" });
      continue;
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: profile.email,
      subject: `Reminder: ${s.merchant_name} renews in 3 days`,
      html: `
        <h2>Subscription Reminder</h2>
        <p>${s.merchant_name} renews on ${formatDate(renewalYMD)}</p>
      `,
    });

    sent++;
    results.push({ id: s.id, sent: true });
  }

  return json(debug ? { ok: true, due, sent, results } : { ok: true, due, sent });
}