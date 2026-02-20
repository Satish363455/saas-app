import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // adjust path if your project differs

// Small helper to send email via Resend HTTP API (works without the Resend SDK)
async function sendResendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL env var");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${text}`);
  return text;
}

function isoDate(daysFromNow = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  // keep only date portion (YYYY-MM-DD) for comparisons if your DB stores dates that way
  return d.toISOString();
}

export async function handler(req: NextRequest) {
  const start = Date.now();
  console.log("RUN: triggered", new Date().toISOString());
  console.log("RUN: method", req.method);
  console.log("RUN: url", req.url);

  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const test = searchParams.get("test");

  // Validate secret
  if (!secret || secret !== process.env.CRON_SECRET) {
    console.log("RUN: unauthorized - missing/invalid secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("RUN: secret ok");

  // If test mode, send a single test email
  if (test === "1") {
    console.log("RUN: TEST MODE");
    const testEmail = process.env.REMINDER_TEST_EMAIL;
    if (!testEmail) {
      console.log("RUN: REMINDER_TEST_EMAIL not set - cannot send test");
      return NextResponse.json({
        ok: false,
        message:
          "Set REMINDER_TEST_EMAIL env var to receive test emails (e.g. REMINDER_TEST_EMAIL=you@example.com).",
      });
    }

    try {
      const subject = "SubWise — Test reminder (from run endpoint)";
      const html = `<p>This is a test reminder email from SubWise (run endpoint) at ${new Date().toISOString()}.</p>`;
      const resp = await sendResendEmail(testEmail, subject, html);
      console.log("RUN: TEST EMAIL sent to", testEmail, "response:", resp);
      const duration = Date.now() - start;
      return NextResponse.json({
        ok: true,
        mode: "test",
        to: testEmail,
        duration_ms: duration,
      });
    } catch (err: any) {
      console.error("RUN: TEST EMAIL error:", err?.message || err);
      return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
    }
  }

  // Normal run path: fetch due subscriptions and send emails (or log them)
  try {
    console.log("RUN: connecting to Supabase");
    const supabase = await createClient();

    // determine how many days before renewal we notify
    const daysBefore = Number(process.env.REMINDER_DAYS_BEFORE ?? 3);
    console.log("RUN: REMINDER_DAYS_BEFORE =", daysBefore);

    // compute cutoff date (include today + daysBefore)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysBefore);
    const cutoffISO = cutoff.toISOString();

    console.log("RUN: fetching tracked_subscriptions due on or before", cutoffISO);

    // Try to fetch subscriptions that are due soon and active
    const { data: subs, error: subsErr } = await supabase
      .from("tracked_subscriptions")
      .select("id, merchant_name, plan_name, amount, currency, renewal_date, user_id, user_email") // user_email if present
      .eq("status", "active")
      .lte("renewal_date", cutoffISO)
      .order("renewal_date", { ascending: true });

    if (subsErr) {
      console.error("RUN: supabase fetch error:", subsErr);
      return NextResponse.json({ ok: false, error: subsErr.message }, { status: 500 });
    }

    const dueCount = Array.isArray(subs) ? subs.length : 0;
    console.log("RUN: due subscriptions count =", dueCount);

    // If none due, return quickly
    if (!dueCount) {
      const duration = Date.now() - start;
      console.log("RUN: nothing due. duration_ms=", duration);
      return NextResponse.json({ ok: true, due: 0, duration_ms: duration });
    }

    // Prepare to send emails; for each subscription try to find an email
    const results: Array<{ id: string; to?: string; sent?: boolean; error?: string }> = [];

    for (const s of subs as any[]) {
      const id = s.id;
      let to: string | null = null;

      // If tracked_subscriptions has a user_email field, prefer it
      if (s.user_email) {
        to = s.user_email;
      } else if (s.user_id) {
        // try to lookup user email in your users table
        try {
          const { data: userRows, error: userErr } = await supabase
            .from("users")
            .select("email")
            .eq("id", s.user_id)
            .limit(1)
            .single();

          if (userErr) {
            console.log(`RUN: could not fetch user for user_id=${s.user_id}`, userErr.message);
          } else if (userRows?.email) {
            to = userRows.email;
          }
        } catch (err) {
          console.log("RUN: error fetching user email:", err);
        }
      }

      if (!to) {
        console.log(`RUN: skipping id=${id} (no recipient email found)`);
        results.push({ id, error: "no recipient email found" });
        continue;
      }

      // Compose a simple email
      const subject = `Reminder: ${s.merchant_name} renewal on ${s.renewal_date}`;
      const html = `
        <p>Hi —</p>
        <p>This is a reminder that <strong>${s.merchant_name}</strong> (${s.plan_name ?? ""}) is renewing on <strong>${s.renewal_date}</strong>.</p>
        <p>Amount: ${s.amount} ${s.currency}</p>
        <p>If you want to manage or cancel this subscription, visit your SubWise dashboard.</p>
      `;

      try {
        console.log(`RUN: sending email for id=${id} -> ${to}`);
        const resp = await sendResendEmail(to, subject, html);
        console.log(`RUN: sent id=${id} response:`, typeof resp === "string" ? resp.slice(0, 200) : resp);
        results.push({ id, to, sent: true });
      } catch (err: any) {
        console.error(`RUN: send error for id=${id} to=${to}:`, err?.message || err);
        results.push({ id, to, sent: false, error: String(err?.message || err) });
      }
    }

    const duration = Date.now() - start;
    console.log("RUN: finished. duration_ms=", duration, "results:", results);
    return NextResponse.json({ ok: true, due: dueCount, results, duration_ms: duration });
  } catch (err: any) {
    console.error("RUN: unexpected error:", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}