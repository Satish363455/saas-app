// app/dashboard/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TrackedSubscriptionsSection from "./TrackedSubscriptionsSection";
import type { TrackedSub } from "./types";
import MerchantIcon from "@/app/components/MerchantIcon";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function safeDate(dateStr: string) {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(dateStr: string) {
  const now = startOfDay(new Date());
  const d = safeDate(dateStr);
  if (!d) return null;
  const sd = startOfDay(d);
  return Math.ceil((sd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ---------------- Page ---------------- */

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

  const reminderDays = profile?.reminder_days ?? 3;
  const preferredCurrency = profile?.preferred_currency ?? "USD";

  // Dates
  const today = startOfDay(new Date());
  const in7 = startOfDay(new Date());
  in7.setDate(in7.getDate() + 7);

  const in30 = startOfDay(new Date());
  in30.setDate(in30.getDate() + 30);

  // Total subs (includes expired/cancelled/etc)
  const totalSubs = trackedSubs.length;

  // Active-ish filter (exclude cancelled)
  const activeLike = trackedSubs.filter((s: any) => {
    const status = String(s.status ?? "active").toLowerCase();
    const cancelled = status === "cancelled" || !!s.cancelled_at;
    return !cancelled;
  });

  // Upcoming Renewals (next 7 days, not expired, not cancelled)
  const upcoming = activeLike
    .filter((s: any) => {
      const d = safeDate(String(s.renewal_date));
      if (!d) return false;
      const sd = startOfDay(d);
      return sd >= today && sd <= in7;
    })
    .sort((a: any, b: any) =>
      String(a.renewal_date).localeCompare(String(b.renewal_date))
    )
    .slice(0, 6);

  // Next upcoming renewal (not expired, not cancelled)
  const nextUpcoming = activeLike
    .filter((s: any) => {
      const d = safeDate(String(s.renewal_date));
      if (!d) return false;
      return startOfDay(d) >= today;
    })
    .sort((a: any, b: any) =>
      String(a.renewal_date).localeCompare(String(b.renewal_date))
    )[0];

  // Payment Forecast (next 30 days)
  const forecastItems = activeLike
    .filter((s: any) => {
      const d = safeDate(String(s.renewal_date));
      if (!d) return false;
      const sd = startOfDay(d);
      return sd >= today && sd <= in30;
    })
    .sort((a: any, b: any) =>
      String(a.renewal_date).localeCompare(String(b.renewal_date))
    );

  const expectedTotal = forecastItems.reduce((sum: number, s: any) => {
    const n = typeof s.amount === "number" ? s.amount : Number(s.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  // Monthly spend (normalized)
  const monthlySpend = activeLike.reduce((sum: number, s: any) => {
    const amt = typeof s.amount === "number" ? s.amount : Number(s.amount);
    const n = Number.isFinite(amt) ? amt : 0;

    const bc = String(s.billing_cycle ?? "monthly").toLowerCase();
    if (bc === "weekly") return sum + n * (52 / 12);
    if (bc === "every_2_weeks" || bc === "2_weeks") return sum + n * (26 / 12);
    if (bc === "every_3_months" || bc === "3_months") return sum + n / 3;
    if (bc === "every_6_months" || bc === "6_months") return sum + n / 6;
    if (bc === "yearly") return sum + n / 12;
    return sum + n; // monthly
  }, 0);

  // Yearly spend (normalized)
  const yearlySpend = activeLike.reduce((sum: number, s: any) => {
    const amt = typeof s.amount === "number" ? s.amount : Number(s.amount);
    const n = Number.isFinite(amt) ? amt : 0;

    const bc = String(s.billing_cycle ?? "monthly").toLowerCase();
    if (bc === "weekly") return sum + n * 52;
    if (bc === "every_2_weeks" || bc === "2_weeks") return sum + n * 26;
    if (bc === "every_3_months" || bc === "3_months") return sum + n * 4;
    if (bc === "every_6_months" || bc === "6_months") return sum + n * 2;
    if (bc === "yearly") return sum + n;
    return sum + n * 12;
  }, 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-black/60">
              Overview of your subscriptions and upcoming renewals.
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
              href="#add-subscription"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              + Add Subscription
            </a>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-black/70">
              Total subscriptions
            </div>
            <div className="mt-2 text-3xl font-semibold text-black">
              {totalSubs}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-black/70">Monthly spend</div>
            <div className="mt-2 text-3xl font-semibold text-black">
              {preferredCurrency} {monthlySpend.toFixed(2)}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-black/70">Yearly spend</div>
            <div className="mt-2 text-3xl font-semibold text-black">
              {preferredCurrency} {yearlySpend.toFixed(2)}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-black/70">Next renewal</div>
            <div className="mt-2 text-3xl font-semibold text-black">
              {nextUpcoming?.renewal_date
                ? new Date(String((nextUpcoming as any).renewal_date)).toLocaleDateString(
                    "en-US"
                  )
                : "—"}
            </div>
          </section>
        </div>

        {/* FULL WIDTH Upcoming + Forecast */}
        <div className="space-y-6">
        {/* Upcoming Renewals */}
<section className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
  {/* Accent */}
  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-emerald-500/70" />

  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-sm font-semibold text-black flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
          ⏳
        </span>
        Upcoming Renewals
      </h2>
      <p className="mt-1 text-xs text-black/50">
        What’s renewing soon — sorted by closest date
      </p>
    </div>

    <span className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
      Next 7 days
    </span>
  </div>

  <div className="mt-5 space-y-3 max-h-[360px] overflow-auto pr-1">
    {upcoming.length === 0 ? (
      <p className="text-sm text-black/60">No renewals in the next 7 days.</p>
    ) : (
      upcoming.map((s: any) => {
        const vendor = String(s.merchant_name ?? s.vendor ?? "Subscription");

        const diffDays = daysUntil(String(s.renewal_date));
        const badgeText =
          diffDays === null
            ? "—"
            : diffDays <= 0
            ? "Today"
            : diffDays === 1
            ? "Tomorrow"
            : `In ${diffDays} days`;

        const badgeClass =
          diffDays !== null && diffDays <= 1
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : diffDays !== null && diffDays <= 3
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";

        const currency = String(s.currency ?? preferredCurrency ?? "USD");
        const amount =
          typeof s.amount === "number" ? s.amount.toFixed(2) : s.amount ?? "—";

        // mini progress: 0 days => full, 7 days => small
        const pct =
          diffDays === null ? 0 : Math.max(0, Math.min(100, (1 - diffDays / 7) * 100));

        return (
          <div
            key={String(s.id)}
            className="group rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <MerchantIcon name={vendor} size={42} className="shrink-0" />

                <div className="min-w-0">
                  <div className="font-semibold leading-tight truncate">
                    {vendor}
                  </div>
                  <div className="text-xs text-black/55 truncate">
                    {s.plan ?? s.plan_name ?? "Subscription"} •{" "}
                    {new Date(String(s.renewal_date)).toLocaleDateString("en-US")}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-black">
                  {currency} {amount}
                </div>
                <span
                  className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}
                >
                  {badgeText}
                </span>
              </div>
            </div>

            {/* mini progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full rounded-full bg-emerald-500/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })
    )}
  </div>
</section>

          {/* Payment Forecast */}
          {/* Payment Forecast */}
<section className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
  {/* Accent */}
  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-indigo-500/70" />

  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-sm font-semibold text-black flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-700">
          📈
        </span>
        Payment Forecast
      </h2>
      <p className="mt-1 text-xs text-black/50">
        Expected charges coming up — next 30 days
      </p>
    </div>

    <span className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
      Next 30 days
    </span>
  </div>

  <div className="mt-5 rounded-2xl border border-black/10 bg-white px-4 py-3">
    <div className="flex items-center justify-between text-sm">
      <span className="text-black/60">Expected total</span>
      <span className="text-base font-semibold text-black">
        {preferredCurrency} {expectedTotal.toFixed(2)}
      </span>
    </div>
  </div>

  <div className="mt-4 space-y-3 max-h-[420px] overflow-auto pr-1">
    {forecastItems.length === 0 ? (
      <p className="text-sm text-black/60">No payments due in the next 30 days.</p>
    ) : (
      forecastItems.slice(0, 10).map((s: any) => {
        const vendor = String(s.merchant_name ?? "Subscription");
        const currency = String(s.currency ?? preferredCurrency ?? "USD");
        const amount =
          typeof s.amount === "number" ? s.amount.toFixed(2) : s.amount ?? "—";

        const diffDays = daysUntil(String(s.renewal_date));
        const due =
          diffDays === null
            ? "—"
            : diffDays <= 0
            ? "Due today"
            : diffDays === 1
            ? "Due tomorrow"
            : `Due in ${diffDays} days`;

        return (
          <div
            key={String(s.id)}
            className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MerchantIcon name={vendor} size={42} className="shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold leading-tight truncate">{vendor}</div>
                <div className="text-xs text-black/55 truncate">
                  {new Date(String(s.renewal_date)).toLocaleDateString("en-US")} •{" "}
                  {due}
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold text-black">
                {currency} {amount}
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
</section>
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