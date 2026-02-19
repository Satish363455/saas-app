// app/dashboard/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackedSubscriptionsSection from "./TrackedSubscriptionsSection";
import type { TrackedSub } from "./types";
import MerchantIcon from "@/app/components/MerchantIcon";
import SubscriptionAnalytics from "./SubscriptionAnalytics";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";
import DashboardShell from "./components/DashboardShell";
import KpiGrid from "./components/KpiGrid";
import UpcomingRenewalsCard from "./components/UpcomingRenewalsCard";
import ForecastCard from "./components/ForecastCard";


export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntilDate(d: Date) {
  const now = startOfDay(new Date());
  const sd = startOfDay(d);
  return Math.ceil((sd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Parse YYYY-MM-DD as *local* date (prevents timezone -1 day bug)
function parseDateOnlyLocal(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function getEffectiveRenewalDate(s: any) {
  const next = effectiveNextRenewal({
    renewalDate: s.renewal_date,
    billingCycle: s.billing_cycle,
    cancelled:
      String(s.status ?? "").toLowerCase() === "cancelled" || !!s.cancelled_at,
  });

  if (!next) return null;

  // If engine returns YYYY-MM-DD, parse as LOCAL date
  if (typeof next === "string" && /^\d{4}-\d{2}-\d{2}$/.test(next)) {
    const d = parseDateOnlyLocal(next);
    return d ? startOfDay(d) : null;
  }

  return startOfDay(new Date(next));
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US");
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
  const preferredCurrency = profile?.preferred_currency ?? "USD";

  // Dates
  const today = startOfDay(new Date());
  const in7 = startOfDay(new Date());
  in7.setDate(in7.getDate() + 7);

  const in30 = startOfDay(new Date());
  in30.setDate(in30.getDate() + 30);

  // Total subs
  const totalSubs = trackedSubs.length;

  // Cancelled count
  const cancelledCount = trackedSubs.filter((s: any) => {
    const status = String(s.status ?? "").toLowerCase();
    return status === "cancelled" || !!s.cancelled_at;
  }).length;

  // Active-like (exclude cancelled)
  const activeLike = trackedSubs.filter((s: any) => {
    const status = String(s.status ?? "active").toLowerCase();
    const cancelled = status === "cancelled" || !!s.cancelled_at;
    return !cancelled;
  });

  // Build effective renewal date ONCE for everything
  const withEffective = activeLike
    .map((s: any) => ({
      ...s,
      effective_renewal_date: getEffectiveRenewalDate(s),
    }))
    .filter((s: any) => !!s.effective_renewal_date);

  // Counts using effective date
  const expiredCount = withEffective.filter((s: any) => {
    const d = s.effective_renewal_date as Date;
    return d < today;
  }).length;

  const renewSoonCount = withEffective.filter((s: any) => {
    const d = s.effective_renewal_date as Date;
    return d >= today && d <= in7;
  }).length;

  const activeCount = withEffective.filter((s: any) => {
    const d = s.effective_renewal_date as Date;
    return d >= today;
  }).length;

  // Upcoming (next 7 days) using effective date
  const upcoming = withEffective
    .filter((s: any) => {
      const d = s.effective_renewal_date as Date;
      return d >= today && d <= in7;
    })
    .sort(
      (a: any, b: any) =>
        (a.effective_renewal_date as Date).getTime() -
        (b.effective_renewal_date as Date).getTime()
    )
    .slice(0, 6);

  // Next renewal using effective date
  const nextUpcoming = withEffective
    .filter((s: any) => (s.effective_renewal_date as Date) >= today)
    .sort(
      (a: any, b: any) =>
        (a.effective_renewal_date as Date).getTime() -
        (b.effective_renewal_date as Date).getTime()
    )[0];

  // Forecast (next 30 days) using effective date
  const forecastItems = withEffective
    .filter((s: any) => {
      const d = s.effective_renewal_date as Date;
      return d >= today && d <= in30;
    })
    .sort(
      (a: any, b: any) =>
        (a.effective_renewal_date as Date).getTime() -
        (b.effective_renewal_date as Date).getTime()
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
    return sum + n;
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

  // -------------------------
  // NEW: render using new components / layout
  // -------------------------
  return (
    <DashboardShell userEmail={user.email ?? ""}>
      {/* KPI / summary grid */}
      <KpiGrid
        total={totalSubs}
        monthly={monthlySpend}
        yearly={yearlySpend}
        nextRenewal={formatDate(nextUpcoming?.effective_renewal_date ?? null)}
        currency={preferredCurrency}
      />

      {/* keep analytics (optional) */}
      <div className="mt-6">
        <SubscriptionAnalytics subs={trackedSubs} />
      </div>

      {/* Upcoming renewals + Forecast */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <UpcomingRenewalsCard items={upcoming} currency={preferredCurrency} />
        <ForecastCard total={expectedTotal} currency={preferredCurrency} />
      </div>

      {/* tracked subscriptions list + add form */}
      <div className="mt-6">
        <TrackedSubscriptionsSection initialSubs={trackedSubs} />
      </div>
    </DashboardShell>
  );
}