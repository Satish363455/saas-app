// app/settings/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  // Ensure profile row exists
  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  // Load profile settings + profile fields
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "reminders_enabled, reminder_days, preferred_currency, timezone, full_name, avatar_url, phone, bio"
    )
    .eq("id", user.id)
    .maybeSingle();

  const initial = {
    reminders_enabled: !!profile?.reminders_enabled,
    reminder_days: (profile?.reminder_days ?? 3) as 1 | 3 | 7,
    preferred_currency: profile?.preferred_currency ?? "USD",
    timezone: profile?.timezone ?? "UTC",

    // ✅ SettingsForm will use these if you added them there
    full_name: profile?.full_name ?? "",
    avatar_url: profile?.avatar_url ?? null,
    phone: profile?.phone ?? "",
    bio: profile?.bio ?? "",
    email: user.email ?? "",
  };

  // Upcoming renewals (next 7 days)
  const now = new Date();
  const in7 = new Date();
  in7.setDate(now.getDate() + 7);

  const { data: tracked } = await supabase
    .from("tracked_subscriptions")
    .select("id, merchant_name, amount, currency, renewal_date, status, cancelled_at")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  const upcoming =
    (tracked ?? [])
      .filter((s: any) => {
        const d = new Date(String(s.renewal_date));
        const isCancelled =
          String(s.status).toLowerCase() === "cancelled" || !!s.cancelled_at;
        return !Number.isNaN(d.getTime()) && !isCancelled && d >= now && d <= in7;
      })
      .slice(0, 6) ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-black/60">
              Logged in as{" "}
              <span className="font-medium text-black/75">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* ✅ This is where avatar upload lives (inside SettingsForm) */}
            <SettingsForm initial={initial as any} />
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Card
              title="Upcoming Renewals"
              right={
                <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
                  Next 7 days
                </span>
              }
            >
              {upcoming.length === 0 ? (
                <p className="text-sm text-black/60">
                  No renewals in the next 7 days.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-black">
                          {s.merchant_name ?? "Subscription"}
                        </div>
                        <div className="text-xs text-black/55">
                          {new Date(String(s.renewal_date)).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-black">
                          {(s.currency ?? initial.preferred_currency) + " "}
                          {typeof s.amount === "number"
                            ? s.amount.toFixed(2)
                            : s.amount ?? "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Email Delivery">
              <div className="flex items-start gap-2">
                <div
                  className={`mt-1 h-4 w-4 rounded-full ${
                    initial.reminders_enabled ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold text-black">
                    {initial.reminders_enabled
                      ? "Reminders enabled"
                      : "Reminders disabled"}
                  </div>
                  <div className="text-xs text-black/55">
                    {initial.reminders_enabled
                      ? "Send a test reminder email (stays on this page)."
                      : "Enable reminders in settings to send emails."}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {/* NOTE: This form will navigate to JSON.
                    To keep the user on page, use your SendTestEmailButton client component instead. */}
                <form method="post" action="/api/reminders/run?mode=test">
                  <button
                    type="submit"
                    disabled={!initial.reminders_enabled}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
                  >
                    Send test email
                  </button>
                </form>

                <p className="mt-2 text-xs text-black/45">
                  Tip: In production, use Vercel Cron with Authorization header.
                </p>
              </div>
            </Card>

            <Card title="Quick Links">
              <div className="grid gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center font-semibold hover:bg-black/5"
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-center font-semibold hover:bg-black/5"
                >
                  Account
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}