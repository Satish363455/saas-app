// app/api/reminders/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";

export const runtime = "nodejs";

// default reminder days if profile doesn't have it
const DEFAULT_REMIND_DAYS = Number(process.env.REMINDER_DAYS_BEFORE ?? 3);

const resend = new Resend(process.env.RESEND_API_KEY || "");

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntilLocal(ymd: string) {
  // renewal date stored as YYYY-MM-DD; interpret as local midnight
  if (!isYMD(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const target = startOfDayLocal(new Date(y, m - 1, d));
  const today = startOfDayLocal(new Date());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatMoney(amount: any, currency: any) {
  const n = typeof amount === "number" ? amount : Number(amount);
  const cur = String(currency || "USD").toUpperCase();
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendReminderEmail(args: {
  to: string;
  sub: any;
  renewalYMD: string;
  daysLeft: number;
}) {
  const { to, sub, renewalYMD, daysLeft } = args;

  const from = process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const merchant = sub.merchant_name || "Subscription";
  const plan = sub.plan_name ? ` (${sub.plan_name})` : "";
  const amountStr = formatMoney(sub.amount, sub.currency);

  const subject =
    daysLeft <= 0
      ? `Reminder: ${merchant}${plan} renews today`
      : `Reminder: ${merchant}${plan} renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.6;background:#f7f7fb;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;padding:20px;">
      <h2 style="margin:0 0 10px;">Subscription Reminder</h2>

      <p style="margin:0 0 10px;">
        <strong>${merchant}${plan}</strong><br/>
        Renews on <strong>${renewalYMD}</strong>
        ${daysLeft > 0 ? `(<strong>${daysLeft}</strong> day${daysLeft === 1 ? "" : "s"} left)` : ""}
      </p>

      <p style="margin:0 0 12px;">
        Amount: <strong>${amountStr}</strong>
      </p>

      <a href="${siteUrl}/dashboard"
         style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600;">
        Manage in SubWise
      </a>

      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />

      <p style="margin:0;font-size:12px;color:#666;">
        You received this because email reminders are enabled in SubWise.
      </p>
    </div>
  </div>
  `;

  const result = await resend.emails.send({ from, to, subject, html });
  if ((result as any)?.error) throw new Error((result as any).error.message || "Resend error");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const debug = searchParams.get("debug") === "1";

    // mode=test lets you test without updating last_reminded_renewal_date
    const mode = searchParams.get("mode") || "";
    const isTest = mode === "test";

    if (!secret || secret !== process.env.CRON_SECRET) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    requireEnv("RESEND_API_KEY");
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Load subscriptions (not cancelled)
    const { data: subs, error } = await supabase
      .from("tracked_subscriptions")
      .select(
        "id,user_id,merchant_name,plan_name,renewal_date,billing_cycle,status,cancelled_at,amount,currency,last_reminded_renewal_date"
      )
      .neq("status", "cancelled");

    if (error) return json({ ok: false, error: error.message }, { status: 500 });

    // 2) Load profiles (email + reminders settings)
    const userIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id).filter(Boolean)));

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,email,reminders_enabled,reminder_days")
      .in("id", userIds);

    if (pErr) return json({ ok: false, error: pErr.message }, { status: 500 });

    const profileByUser = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileByUser.set(p.id, p));

    let checked = 0;
    let due = 0;
    let sent = 0;

    const results: any[] = [];

    for (const s of subs ?? []) {
      checked++;

      const cancelled =
        String(s.status ?? "").toLowerCase() === "cancelled" || !!s.cancelled_at;
      if (cancelled) {
        if (debug) results.push({ id: s.id, skipped: "cancelled" });
        continue;
      }

      const prof = profileByUser.get(s.user_id);
      const to = prof?.email;

      // reminders enabled?
      const remindersEnabled = prof?.reminders_enabled ?? true;
      if (!remindersEnabled) {
        if (debug) results.push({ id: s.id, skipped: "reminders_disabled" });
        continue;
      }

      if (!to || !String(to).includes("@")) {
        if (debug) results.push({ id: s.id, skipped: "no_email" });
        continue;
      }

      const remindDays = Number(prof?.reminder_days ?? DEFAULT_REMIND_DAYS);

      const next = effectiveNextRenewal({
        renewalDate: s.renewal_date,
        billingCycle: s.billing_cycle,
        cancelled: false,
      });

      if (!next || !isYMD(String(next))) {
        if (debug) results.push({ id: s.id, skipped: "no_valid_next_date", next });
        continue;
      }

      const daysLeft = daysUntilLocal(String(next));
      if (daysLeft === null) {
        if (debug) results.push({ id: s.id, skipped: "bad_date_parse", next });
        continue;
      }

      // ✅ EXACTLY N days before (default 3)
      if (daysLeft !== remindDays) {
        if (debug) results.push({ id: s.id, skipped: "not_due", next, daysLeft, remindDays });
        continue;
      }

      due++;

      // ✅ Send only once per renewal date (dedupe)
      if (!isTest && String(s.last_reminded_renewal_date || "") === String(next)) {
        if (debug) results.push({ id: s.id, skipped: "already_reminded", next, daysLeft });
        continue;
      }

      try {
        await sendReminderEmail({ to, sub: s, renewalYMD: String(next), daysLeft });

        // ✅ mark as reminded (skip in test mode)
        if (!isTest) {
          await supabase
            .from("tracked_subscriptions")
            .update({ last_reminded_renewal_date: String(next) })
            .eq("id", s.id);
        }

        sent++;
        if (debug) results.push({ id: s.id, sent: true, to, next, daysLeft, remindDays });

        // ✅ avoid Resend rate limit
        await sleep(600);
      } catch (e: any) {
        if (debug) results.push({ id: s.id, error: e?.message || "send_failed", next, daysLeft });
      }
    }

    return json(
      debug
        ? { ok: true, mode: mode || "cron", checked, due, sent, results }
        : { ok: true, checked, due, sent }
    );
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}