// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = [
  "reminders_enabled",
  "reminder_days",
  "preferred_currency",
  "timezone",
  "full_name",
  "phone",
  "bio",
  "avatar_url",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, any>;

    // Build payload ONLY from fields provided (prevents wiping fields)
    const payload: Record<AllowedKey, any> = {} as any;

    for (const k of ALLOWED_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        payload[k] = body[k];
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // Normalize types safely
    if ("reminders_enabled" in payload) {
      payload.reminders_enabled = Boolean(payload.reminders_enabled);
    }
    if ("reminder_days" in payload) {
      const n = Number(payload.reminder_days);
      payload.reminder_days = [1, 3, 7].includes(n) ? n : 3;
    }
    if ("preferred_currency" in payload) {
      payload.preferred_currency = String(payload.preferred_currency || "USD")
        .trim()
        .toUpperCase();
    }
    if ("timezone" in payload) {
      payload.timezone = String(payload.timezone || "UTC").trim();
    }
    if ("full_name" in payload) payload.full_name = String(payload.full_name || "").trim();
    if ("phone" in payload) payload.phone = String(payload.phone || "").trim();
    if ("bio" in payload) payload.bio = String(payload.bio || "").trim();
    if ("avatar_url" in payload) payload.avatar_url = payload.avatar_url ? String(payload.avatar_url) : null;

    // ✅ Upsert ensures the row exists
    const { error: upErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email, ...payload }, { onConflict: "id" });

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}