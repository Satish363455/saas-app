import { NextRequest, NextResponse } from "next/server";

// If you already have logic in POST, keep it in a shared function:
async function runReminders(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ call your existing reminder sending logic here
  // return NextResponse.json({ ok: true, sent: X });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return runReminders(req);
}

export async function POST(req: NextRequest) {
  return runReminders(req);
}