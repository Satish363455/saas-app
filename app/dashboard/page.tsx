// app/dashboard/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TrackedSubscriptionsSection from "./TrackedSubscriptionsSection";
import type { TrackedSub } from "./types";
import MerchantIcon from "@/app/components/MerchantIcon";
import SendTestEmailButton from "./SendTestEmailButton";

export const dynamic = "force-dynamic";

function daysUntil(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  // Ensure profile exists
  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "reminders_enabled, reminder_days, preferred_currency, timezone, full_name, avatar_url"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: tracked } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  const trackedSubs = (tracked ?? []) as TrackedSub[];

  // Upcoming renewals (next 7 days)
  const now = new Date();
  const in7 = new Date();
  in7.setDate(now.getDate() + 7);

  const upcoming = trackedSubs
    .filter((s) => {
      const d = new Date(String((s as any).renewal_date));
      return !Number.isNaN(d.getTime()) && d >= now && d <= in7;
    })
    .slice(0, 6);

  const reminderDays = profile?.reminder_days ?? 3;
  const preferredCurrency = profile?.preferred_currency ?? "USD";
  const timezone = profile?.timezone ?? "UTC";
  const remindersEnabled = !!profile?.reminders_enabled;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-black/60">
              Overview of your active subscriptions and upcoming renewals.
            </p>
            <p className="mt-1 text-xs text-black/50">
              Logged in as{" "}
              <span className="font-medium text-black/75">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white"
            >
              Settings
            </Link>

            <a
              href="hsla(180, 55%, 74%, 1.00)-subscription"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              + Add Subscription
            </a>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Upcoming Renewals */}
          <section className="lg:col-span-2 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black">
                Upcoming Renewals
              </h2>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
                Next 7 days
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-black/60">
                  No renewals in the next 7 days.
                </p>
              ) : (
                upcoming.map((s) => {
                  const vendor = String(
                    (s as any).merchant_name ??
                      (s as any).vendor ??
                      "Subscription"
                  );

                  const diffDays = daysUntil(String((s as any).renewal_date));
                  const badge =
                    diffDays === null
                      ? "—"
                      : diffDays <= 0
                      ? "Today"
                      : diffDays === 1
                      ? "In 1 day"
                      : `In ${diffDays} days`;

                  const currency = String(
                    (s as any).currency ?? preferredCurrency ?? "USD"
                  );

                  const amount =
                    typeof (s as any).amount === "number"
                      ? (s as any).amount.toFixed(2)
                      : (s as any).amount ?? "—";

                  return (
                    <div
                      key={(s as any).id}
                      className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MerchantIcon
                          name={vendor}
                          size={40}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight truncate">
                            {vendor}
                          </div>
                          <div className="text-xs text-black/55 truncate">
                            {(s as any).plan ??
                              (s as any).plan_name ??
                              "Subscription"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-black">
                            {currency} {amount}
                          </div>
                          <div className="text-xs text-black/55">
                            {new Date(
                              String((s as any).renewal_date)
                            ).toLocaleDateString()}
                          </div>
                        </div>

                        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
                          {badge}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Reminder Settings Summary */}
            <Card title="Reminder Settings">
              <div className="space-y-2 text-sm text-black/70">
                <div className="flex items-center justify-between">
                  <span>Email reminders</span>
                  <span className="font-semibold text-black">
                    {remindersEnabled ? "On" : "Off"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Reminder window</span>
                  <span className="font-semibold text-black">
                    {reminderDays} days
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Timezone</span>
                  <span className="font-semibold text-black">{timezone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Currency</span>
                  <span className="font-semibold text-black">
                    {preferredCurrency}
                  </span>
                </div>
              </div>

              <Link
                href="/settings"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5"
              >
                Edit settings
              </Link>
            </Card>

            {/* Email Delivery */}
            <Card title="Email Delivery">
              <div className="flex items-start gap-2">
                <div
                  className={`mt-1 h-4 w-4 rounded-full ${
                    remindersEnabled ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold text-black">
                    {remindersEnabled
                      ? "Authenticated reminders"
                      : "Reminders disabled"}
                  </div>
                  <div className="text-xs text-black/55">
                    {remindersEnabled
                      ? "Send a test reminder email (stays on this page)."
                      : "Enable reminders in Settings to send emails."}
                  </div>
                </div>
              </div>

              {/* ✅ No navigation, no JSON page */}
              <SendTestEmailButton disabled={!remindersEnabled} />

              <p className="mt-2 text-xs text-black/45">
                Tip: In production, use Vercel Cron (Authorization header) instead
                of query secret.
              </p>
            </Card>

            {/* Account */}
            <Card title="Account">
              <p className="text-sm text-black/60">
                Update your profile details.
              </p>

              <Link
                href="/account"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5"
              >
                View account
              </Link>
            </Card>
          </div>
        </div>

        {/* Tracked subscriptions + Add subscription section */}
        <section
          id="add-subscription"
          className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur"
        >
          <TrackedSubscriptionsSection initialSubs={trackedSubs} />
        </section>

        {/* Sign out */}
        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
          <form action="/auth/signout" method="post" className="flex justify-end">
            <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}