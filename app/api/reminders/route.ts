// app/api/reminders/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/** Start of today in UTC */
function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUTC(d: Date, days: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function parseDateUTC(dateStr: string) {
  const d = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(dateStr: string) {
  const d = parseDateUTC(dateStr);
  return d ? d.toLocaleDateString() : dateStr;
}

function toYYYYMMDD(dateStr: string) {
  if (!dateStr) return "";
  return dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
}

function getAuthSecret(req: Request) {
  const url = new URL(req.url);

  // 1) Header: Authorization: Bearer <secret>   (Vercel Cron sends this)
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : "";

  // 2) Query fallback: ?secret=<secret> (useful for manual testing)
  const querySecret = url.searchParams.get("secret")?.trim() || "";

  return bearer || querySecret;
}

export async function GET(req: Request) {
  try {
    // read any mode param (mode=test => bypass dedupe)
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || ""; // "" or "test"

    // ✅ AUTH: use CRON_SECRET (this is what Vercel Cron expects)
    const secret = getAuthSecret(req);
    const expected = process.env.CRON_SECRET;

    if (!expected || !secret || secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) env checks
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com";

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        {
          error: "Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // 3) supabase admin client (service role)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // how many days before renewal to send reminders (window)
    const DAYS_BEFORE = Number(process.env.REMINDER_DAYS_BEFORE ?? 3);

    const today = startOfTodayUTC();
    const end = addDaysUTC(today, DAYS_BEFORE);

    // 4) load tracked subscriptions renewing soon
    const { data: tracked, error: trackedErr } = await supabaseAdmin
      .from("tracked_subscriptions")
      .select(
        "id, user_id, merchant_name, plan_name, amount, currency, renewal_date, status, cancelled_at, last_reminded_renewal_date"
      )
      .gte("renewal_date", today.toISOString().slice(0, 10)) // YYYY-MM-DD
      .lte("renewal_date", end.toISOString().slice(0, 10))
      .neq("status", "cancelled");

    if (trackedErr) {
      return NextResponse.json({ error: trackedErr.message }, { status: 500 });
    }

    if (!tracked || tracked.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skippedNoEmail: 0,
        skippedAlreadyReminded: 0,
        checked: 0,
        windowDays: DAYS_BEFORE,
        debug: [],
      });
    }

    // 5) map user_id -> email (using auth admin)
    const userIds = Array.from(new Set(tracked.map((t: any) => t.user_id).filter(Boolean)));

    const userEmailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (!error && data?.user?.email) {
        userEmailMap.set(uid, data.user.email);
      }
    }

    // 6) send emails
    let sent = 0;
    let skippedNoEmail = 0;
    let skippedAlreadyReminded = 0;

    for (const s of tracked as any[]) {
      const toEmail = userEmailMap.get(s.user_id);
      if (!toEmail) {
        skippedNoEmail++;
        continue;
      }

      // skip if cancelled
      const isCancelled = String(s.status).toLowerCase() === "cancelled" || !!s.cancelled_at;
      if (isCancelled) continue;

      // send only ONCE per renewal_date, except when mode === "test"
      const renewalOnlyDate = toYYYYMMDD(String(s.renewal_date));
      if (!renewalOnlyDate) continue;

      // If mode is NOT 'test', apply dedupe as before
      if (mode !== "test" && String(s.last_reminded_renewal_date || "") === renewalOnlyDate) {
        skippedAlreadyReminded++;
        continue;
      }

      const subject = `Reminder: ${s.merchant_name} renews on ${fmtDate(String(s.renewal_date))}`;

      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.6;">
          <h2>Subscription Reminder</h2>
          <p>Hello 👋</p>
          <p>
            <strong>${s.merchant_name}</strong>
            ${s.plan_name ? `(${s.plan_name})` : ""} will renew soon.
          </p>
          <p>
            Renewal date: <strong>${fmtDate(String(s.renewal_date))}</strong><br/>
            Amount: <strong>${s.currency} ${Number(s.amount).toFixed(2)}</strong>
          </p>
          <p>You’re receiving this because email reminders are enabled in SubWise.</p>
          <hr />
          <p style="font-size:12px;color:#666;">
            SubWise · Subscription manager<br/>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/dashboard">Manage subscriptions</a>
          </p>
        </div>
      `;

      const result = await resend.emails.send({
        from: `SubWise <${FROM_EMAIL}>`,
        to: toEmail,
        subject,
        html,
      });

      if ((result as any)?.error) {
        // don't increment sent if send failed
        continue;
      }

      // mark as reminded for this renewal date (unless mode === "test" and you want to avoid writing in test)
      // Note: For test mode we still mark so UI shows last_reminded_renewal_date — if you prefer not to write in test mode remove this block
      await supabaseAdmin
        .from("tracked_subscriptions")
        .update({ last_reminded_renewal_date: renewalOnlyDate })
        .eq("id", s.id);

      // log: reminder email sent
      await supabaseAdmin.from("subscription_events").insert({
        subscription_id: s.id,
        user_id: s.user_id,
        event_type: "reminder_sent",
        event_meta: {
          merchant_name: s.merchant_name,
          renewal_date: renewalOnlyDate,
          days_before: DAYS_BEFORE,
          to_email: toEmail,
          amount: s.amount,
          currency: s.currency,
        },
      });

      sent++;
    }

    return NextResponse.json({
      ok: true,
      sent,
      skippedNoEmail,
      skippedAlreadyReminded,
      checked: tracked.length,
      windowDays: DAYS_BEFORE,
      debug: tracked.map((t: any) => ({
        id: t.id,
        merchant: t.merchant_name,
        renewal_date: t.renewal_date,
        status: t.status,
        cancelled_at: t.cancelled_at ?? null,
        user_email: userEmailMap.get(t.user_id) ?? null,
        last_reminded_renewal_date: t.last_reminded_renewal_date ?? null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}