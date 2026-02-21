import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type TrackedSubscription = {
  id: string;
  user_id: string;
  merchant_name: string | null;
  plan_name: string | null;
  renewal_date: string; // timestamptz comes back as ISO string
  amount: number | null;
  currency: string | null;
  remind_days_before: number | null;
  last_reminder_sent_at: string | null;
  status: string | null;
};

type Profile = {
  id: string; // user_id
  email: string | null;
};

const resend = new Resend(process.env.RESEND_API_KEY || "");

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const debug = searchParams.get("debug") === "1";

  if (!secret || secret !== process.env.CRON_SECRET) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // Test mode: send one simple email and exit (kept from your version)
  const test = searchParams.get("test");
  if (test === "1") {
    const to = process.env.REMINDER_TEST_EMAIL || "";
    if (!to.includes("@")) {
      return json(
        { error: "Missing/invalid REMINDER_TEST_EMAIL" },
        { status: 400 }
      );
    }

    const from =
      process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from,
      to,
      subject: "SubWise — Test reminder email",
      html: `<p>Test reminder email OK ✅</p><p>${new Date().toISOString()}</p>`,
    });

    return json({ ok: true, testEmailSent: true, result });
  }

  // ---- REAL REMINDER LOGIC BELOW ----
  try {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const from =
      process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>";

    const DEFAULT_DAYS_BEFORE = Number(process.env.REMINDER_DAYS_BEFORE || "3");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const maxDate = addDays(now, DEFAULT_DAYS_BEFORE);

    // 1) Fetch subscriptions due soon
    const { data: subs, error: subsErr } = await supabase
      .from("tracked_subscriptions")
      .select(
        "id,user_id,merchant_name,plan_name,renewal_date,amount,currency,remind_days_before,last_reminder_sent_at,status"
      )
      .neq("status", "cancelled")
      .lte("renewal_date", maxDate.toISOString());

    if (subsErr) throw subsErr;

    const due = (subs || []) as TrackedSubscription[];

    // 2) Filter out ones already reminded "recently"
    // (simple rule: if last_reminder_sent_at exists and is within last 20 hours, skip)
    const MIN_HOURS_BETWEEN = 20;
    const MIN_MS = MIN_HOURS_BETWEEN * 60 * 60 * 1000;

    const toSend = due.filter((s) => {
      if (!s.last_reminder_sent_at) return true;
      const last = new Date(s.last_reminder_sent_at).getTime();
      return now.getTime() - last > MIN_MS;
    });

    if (toSend.length === 0) {
      return json({ ok: true, ran: true, due: due.length, sent: 0 });
    }

    // 3) Load emails for user_ids (assumes profiles table with email)
    const userIds = Array.from(new Set(toSend.map((s) => s.user_id)));

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", userIds);

    if (profErr) throw profErr;

    const emailByUser = new Map<string, string>();
    (profiles || []).forEach((p: Profile) => {
      if (p.email && p.email.includes("@")) emailByUser.set(p.id, p.email);
    });

    // 4) Send emails + update last_reminder_sent_at
    const results: Array<{ subId: string; to: string; ok: boolean; error?: string }> = [];

    for (const s of toSend) {
      const to =
        emailByUser.get(s.user_id) ||
        process.env.REMINDER_TEST_EMAIL || // fallback so you can still test
        "";

      if (!to.includes("@")) {
        results.push({
          subId: s.id,
          to: "(missing email)",
          ok: false,
          error: "No recipient email found",
        });
        continue;
      }

      const merchant = s.merchant_name || "Subscription";
      const plan = s.plan_name ? ` (${s.plan_name})` : "";
      const renewDate = new Date(s.renewal_date).toLocaleDateString();

      const subject = `Reminder: ${merchant}${plan} renews on ${renewDate}`;

      const amountText =
        s.amount != null && s.currency
          ? `<p><b>Amount:</b> ${s.amount} ${s.currency}</p>`
          : "";

      try {
        await resend.emails.send({
          from,
          to,
          subject,
          html: `
            <h2>Subscription Renewal Reminder</h2>
            <p><b>${merchant}${plan}</b> is renewing soon.</p>
            <p><b>Renewal date:</b> ${renewDate}</p>
            ${amountText}
            <p>You’re receiving this because reminders are enabled in SubWise.</p>
          `,
        });

        // mark sent
        await supabase
          .from("tracked_subscriptions")
          .update({ last_reminder_sent_at: now.toISOString() })
          .eq("id", s.id);

        results.push({ subId: s.id, to, ok: true });
      } catch (e: unknown) {
        results.push({
          subId: s.id,
          to,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const sentCount = results.filter((r) => r.ok).length;

    return json(
      debug
        ? { ok: true, ran: true, due: due.length, attempted: toSend.length, sent: sentCount, results }
        : { ok: true, ran: true, due: due.length, sent: sentCount }
    );
  } catch (e: unknown) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}