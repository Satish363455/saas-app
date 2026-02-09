// app/api/reminders/run/route.ts
import { NextResponse } from "next/server";

/**
 * Server-side helper that triggers /api/reminders using CRON_SECRET.
 * Keeps secrets on the server and allows "test mode".
 *
 * Usage from dashboard:
 *   fetch("/api/reminders/run?mode=test", { method: "POST" })
 *
 * - mode=test  -> should resend every click (requires /api/reminders to honor this)
 * - default    -> production-like behavior (dedupe applies)
 */

export async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET is not configured on the server" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || ""; // "test" or ""

    // Determine base URL (works in local + Vercel)
    const base =
      (process.env.NEXT_PUBLIC_SITE_URL &&
        process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")) ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    // Forward mode to /api/reminders (so it can bypass dedupe for test clicks)
    const url = `${base}/api/reminders${mode ? `?mode=${encodeURIComponent(mode)}` : ""}`;

    const res = await fetch(url, {
      method: "GET", // /api/reminders expects GET
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      cache: "no-store",
    });

    const payload = await res.json().catch(() => ({
      ok: false,
      error: "Failed to parse JSON from /api/reminders",
      rawStatus: res.status,
    }));

    // If upstream failed, surface that status cleanly
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, triggered: true, status: res.status, result: payload },
        { status: res.status }
      );
    }

    return NextResponse.json(
      { ok: true, triggered: true, status: res.status, result: payload },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}