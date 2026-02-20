// app/api/reminders/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function runReminders(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const test = searchParams.get("test");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ TEST MODE: send an email immediately
  if (test === "1") {
    const to =
      process.env.REMINDER_TEST_EMAIL ||
      process.env.NEXT_PUBLIC_TEST_EMAIL || // optional fallback
      "";

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { error: "Missing REMINDER_TEST_EMAIL in env" },
        { status: 400 }
      );
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "SubWise <onboarding@resend.dev>",
      to,
      subject: "✅ SubWise Reminder Test Email",
      html: `<p>If you got this, Render cron + reminders route works 🎉</p>`,
    });

    return NextResponse.json({ ok: true, testEmailSent: true, result });
  }

  // TODO: your real reminder sending logic goes here
  return NextResponse.json({ ok: true, ran: true });
}

export async function GET(req: NextRequest) {
  return runReminders(req);
}

export async function POST(req: NextRequest) {
  return runReminders(req);
}