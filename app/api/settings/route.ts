// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      reminders_enabled: Boolean(body.reminders_enabled),
      reminder_days: Number(body.reminder_days),
      preferred_currency: String(body.preferred_currency ?? "USD"),
      timezone: String(body.timezone ?? "UTC"),
    })
    .eq("id", user.id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}