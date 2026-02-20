// app/api/reminders/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

async function runReminders(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const test = searchParams.get("test");
    const debug = searchParams.get("debug");

    if (!secret || secret !== process.env.CRON_SECRET) {
      console.warn("Unauthorized attempt to run reminders", { got: secret });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TEST mode: send single test email and return result
    if (test === "1") {
      const to =
        process.env.REMINDER_TEST_EMAIL ||
        process.env.NEXT_PUBLIC_TEST_EMAIL ||
        "";

      if (!to || !to.includes("@")) {
        const msg = "Missing or invalid REMINDER_TEST_EMAIL environment variable";
        console.error(msg, { REMINDER_TEST_EMAIL: process.env.REMINDER_TEST_EMAIL });
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      if (!process.env.RESEND_API_KEY) {
        const msg = "Missing RESEND_API_KEY environment variable";
        console.error(msg);
        return NextResponse.json({ error: msg }, { status: 500 });
      }

      // Build a small test email
      const payload = {
        from: process.env.RESEND_FROM_EMAIL || "SubWise <noreply@yourdomain.com>",
        to,
        subject: "SubWise — Test reminder email",
        html: `<p>This is a SubWise test reminder. If you receive this, the reminders route + Resend are working.</p>
               <p>time: ${new Date().toISOString()}</p>`,
      };

      console.log("Sending test email", { to, from: payload.from });

      try {
        const result = await resend.emails.send(payload);
        console.log("Resend.send result:", result);
        // Return debug information when requested
        if (debug === "1") return NextResponse.json({ ok: true, testEmailSent: true, result });
        // Otherwise return a smaller success object
        return NextResponse.json({ ok: true, testEmailSent: true, id: (result as any)?.id || null });
      } catch (sendErr: any) {
        console.error("Resend.send error:", sendErr);
        return NextResponse.json({ ok: false, error: String(sendErr?.message || sendErr), detail: sendErr }, { status: 500 });
      }
    }

    // TODO: insert your actual reminder-sending logic here and return useful info
    console.log("Reminders route called (no test param), running scheduled logic placeholder");
    return NextResponse.json({ ok: true, ran: true });
  } catch (err: any) {
    console.error("runReminders - unexpected error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runReminders(req);
}
export async function POST(req: NextRequest) {
  return runReminders(req);
}