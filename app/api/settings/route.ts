// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // Only update fields that were sent (so profile + settings can share endpoint)
  const patch: Record<string, any> = {};

  // Reminder settings fields
  if (body.reminders_enabled !== undefined)
    patch.reminders_enabled = Boolean(body.reminders_enabled);

  if (body.reminder_days !== undefined)
    patch.reminder_days = Number(body.reminder_days);

  if (body.preferred_currency !== undefined)
    patch.preferred_currency = String(body.preferred_currency ?? "USD");

  if (body.timezone !== undefined)
    patch.timezone = String(body.timezone ?? "UTC");

  // Profile fields
  if (body.full_name !== undefined) patch.full_name = String(body.full_name ?? "");
  if (body.phone !== undefined) patch.phone = String(body.phone ?? "");
  if (body.bio !== undefined) patch.bio = String(body.bio ?? "");
  if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url ?? null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}