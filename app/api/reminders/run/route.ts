// app/api/reminders/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";

export const runtime = "nodejs";

// ✅ Global default (if you don't want per-user reminder days)
const REMIND_DAYS = Number(process.env.REMINDER_DAYS_BEFORE ?? 3);

const resend = new Resend(process.env.RESEND_API_KEY || "");

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Accept either:
// 1) Authorization: Bearer <CRON_SECRET> (Vercel Cron style)
// 2) ?secret=<CRON_SECRET> (manual testing)
function getAuthSecret(req: NextRequest) {
  const url = new URL(req.url);

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : "";

  const querySecret = url.searchParams.get("secret")?.trim() || "";
  return bearer || querySecret;
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

async function sendReminderEmail(to: string, sub: any, renewalYMD: string, remindDays: number) {
  const from = process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const merchant = sub.merchant_name || "Subscription";
  const plan = sub.plan_name ? ` (${sub.plan_name})` : "";
  const amountStr = formatMoney(sub.amount, sub.currency);

  const subject = `Reminder: ${merchant}${plan} renews in ${remindDays} day${remindDays === 1 ? "" : "s"}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.6;background:#f7f7fb;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;padding:20px;">
        <h2 style="margin:0 0 10px;">Subscription Reminder</h2>

        <p style="margin:0 0 10px;">
          <strong>${merchant}${plan}</strong><br/>
          Renews on <strong>${renewalYMD}</strong>
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
          This email is sent once, ${remindDays} days before renewal (if reminders are enabled).
        </p>
      </div>
    </div>
  `;

  const result = await resend.emails.send({ from, to, subject, html });
  if ((result as any)?.error) {
    throw new Error((result as any).error.message || "Resend error");
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1";

    // ✅ auth
    const secret = getAuthSecret(req);
    const expected = process.env.CRON_SECRET;
    if (!expected || !secret || secret !== expected) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    requireEnv("RESEND_API_KEY");
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ✅ load subscriptions (not cancelled)
    const { data: subs, error } = await supabase
      .from("tracked_subscriptions")
      .select(
        "id,user_id,merchant_name,plan_name,renewal_date,billing_cycle,status,cancelled_at,amount,currency,last_reminded_renewal_date"
      )
      .neq("status", "cancelled");

    if (error) return json({ ok: false, error: error.message }, { status: 500 });

    // ✅ load profiles (email + reminders_enabled)
    const userIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id).filter(Boolean)));

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,email,reminders_enabled")
      .in("id", userIds);

    if (pErr) return json({ ok: false, error: pErr.message }, { status: 500 });

    const profileByUser = new Map<string, { email: string; enabled: boolean }>();
    (profiles ?? []).forEach((p: any) => {
      if (p.email && String(p.email).includes("@")) {
        profileByUser.set(p.id, { email: p.email, enabled: !!p.reminders_enabled });
      }
    });

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

      const profile = profileByUser.get(s.user_id);
      if (!profile?.email) {
        if (debug) results.push({ id: s.id, skipped: "no_email" });
        continue;
      }

      if (!profile.enabled) {
        if (debug) results.push({ id: s.id, skipped: "reminders_disabled" });
        continue;
      }

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

      // ✅ Only when EXACTLY N days left
      if (daysLeft !== REMIND_DAYS) {
        if (debug) results.push({ id: s.id, skipped: "not_due", next, daysLeft });
        continue;
      }

      due++;

      // ✅ dedupe: only once per renewal date
      if (String(s.last_reminded_renewal_date || "") === String(next)) {
        if (debug) results.push({ id: s.id, skipped: "already_reminded", next, daysLeft });
        continue;
      }

      try {
        await sendReminderEmail(profile.email, s, String(next), REMIND_DAYS);

        await supabase
          .from("tracked_subscriptions")
          .update({ last_reminded_renewal_date: String(next) })
          .eq("id", s.id);

        sent++;
        if (debug) results.push({ id: s.id, sent: true, to: profile.email, next, daysLeft });

        // ✅ Resend rate limit safety
        await sleep(650);
      } catch (e: any) {
        if (debug) results.push({ id: s.id, error: e?.message || "send_failed", next, daysLeft });
      }
    }

    return json(
      debug
        ? { ok: true, checked, due, sent, remindDays: REMIND_DAYS, results }
        : { ok: true, checked, due, sent }
    );
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}