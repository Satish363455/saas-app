import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { toISODate, parseLocalYMD } from "@/lib/date"; // <-- adjust path if needed

type TrackedSubscription = {
  id: string;
  user_id: string;
  merchant_name: string | null;
  plan_name: string | null;

  // ✅ DATE column expected as YYYY-MM-DD (not timestamptz)
  renewal_date: string;

  amount: number | null;
  currency: string | null;
  remind_days_before: number | null;
  last_reminder_sent_at: string | null;
  status: string | null;
};

type Profile = {
  id: string;
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

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDaysLocal(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDateYMD(ymd: string) {
  if (!ymd) return "";
  return parseLocalYMD(ymd).toLocaleDateString();
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

  // Test mode
  const test = searchParams.get("test");
  if (test === "1") {
    const to = process.env.REMINDER_TEST_EMAIL || "";
    if (!to.includes("@")) {
      return json({ error: "Missing/invalid REMINDER_TEST_EMAIL" }, { status: 400 });
    }

    const from = process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from,
      to,
      subject: "SubWise — Test reminder email",
      html: `<p>Test reminder email OK ✅</p><p>${new Date().toISOString()}</p>`,
    });

    return json({ ok: true, testEmailSent: true, result });
  }

  try {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const from = process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>";

    const DEFAULT_DAYS_BEFORE = Number(process.env.REMINDER_DAYS_BEFORE || "3");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const today = startOfDayLocal(new Date());
    const maxDate = addDaysLocal(today, DEFAULT_DAYS_BEFORE);

    // ✅ Compare DATE column using YYYY-MM-DD strings (LOCAL)
    const maxYMD = toISODate(maxDate);

    const { data: subs, error: subsErr } = await supabase
      .from("tracked_subscriptions")
      .select(
        "id,user_id,merchant_name,plan_name,renewal_date,amount,currency,remind_days_before,last_reminder_sent_at,status"
      )
      .neq("status", "cancelled")
      .lte("renewal_date", maxYMD);

    if (subsErr) throw subsErr;

    const due = (subs || []) as TrackedSubscription[];

    // skip if reminder was sent recently
    const MIN_HOURS_BETWEEN = 20;
    const MIN_MS = MIN_HOURS_BETWEEN * 60 * 60 * 1000;
    const now = new Date();

    const toSend = due.filter((s) => {
      if (!s.last_reminder_sent_at) return true;
      const last = new Date(s.last_reminder_sent_at).getTime();
      return now.getTime() - last > MIN_MS;
    });

    if (toSend.length === 0) {
      return json({ ok: true, ran: true, due: due.length, sent: 0 });
    }

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

    const results: Array<{ subId: string; to: string; ok: boolean; error?: string }> = [];

    for (const s of toSend) {
      const to = emailByUser.get(s.user_id) || process.env.REMINDER_TEST_EMAIL || "";
      if (!to.includes("@")) {
        results.push({ subId: s.id, to: "(missing email)", ok: false, error: "No recipient email found" });
        continue;
      }

      const merchant = s.merchant_name || "Subscription";
      const plan = s.plan_name ? ` (${s.plan_name})` : "";
      const renewDate = fmtDateYMD(String(s.renewal_date));

      const subject = `Reminder: ${merchant}${plan} renews on ${renewDate}`;

      const amountText =
        s.amount != null && s.currency
          ? `<p><b>Amount:</b> ${Number(s.amount).toFixed(2)} ${s.currency}</p>`
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
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}