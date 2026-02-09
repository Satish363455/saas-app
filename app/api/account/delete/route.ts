import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, confirm } = body;
    if (!userId || confirm !== true) {
      return NextResponse.json({ ok: false, error: "Missing userId or confirm" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SERVICE_ROLE) {
      return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Delete user (auth) — requires service role
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }

    // Optionally: cleanup related rows (tracked_subscriptions, events)
    await supabase.from("tracked_subscriptions").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    // (adjust other tables as needed)

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}