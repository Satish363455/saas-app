// app/dashboard/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import type { TrackedSub } from "./types";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";

import DashboardShell from "./components/DashboardShell";
import KpiGrid from "./components/KpiGrid";
import UpcomingRenewalsCard from "./components/UpcomingRenewalsCard";
import ForecastCard from "./components/ForecastCard";
import TrackedSubscriptionsSection from "./TrackedSubscriptionsSection";

import BreakdownCard from "./components/BreakdownCard";
import CategoryCard from "./components/CategoryCard";

export const dynamic = "force-dynamic";

/* ---------------- Date Helpers (timezone-safe) ---------------- */

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseDateSafe(input: string): Date | null {
  const s = String(input || "").trim();
  if (!s) return null;

  if (isYMD(s)) {
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US");
}

/* ---------------- Smart Renewal ---------------- */

function getEffectiveRenewalDate(s: any) {
  const next = effectiveNextRenewal({
    renewalDate: s.renewal_date,
    billingCycle: s.billing_cycle,
    cancelled:
      String(s.status ?? "").toLowerCase() === "cancelled" || !!s.cancelled_at,
  });

  if (!next) return null;
  const parsed = parseDateSafe(String(next));
  if (!parsed) return null;

  return startOfDayLocal(parsed);
}

/* ---------------- Page ---------------- */

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_currency")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tracked } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  const trackedSubs = (tracked ?? []) as TrackedSub[];
  const preferredCurrency = profile?.preferred_currency ?? "USD";

  const today = startOfDayLocal(new Date());

  const in7 = startOfDayLocal(new Date());
  in7.setDate(in7.getDate() + 7);

  const in30 = startOfDayLocal(new Date());
  in30.setDate(in30.getDate() + 30);

  const cancelledCount = trackedSubs.filter((s: any) => {
    const status = String(s.status ?? "").toLowerCase();
    return status === "cancelled" || !!s.cancelled_at;
  }).length;

  const activeLike = trackedSubs.filter((s: any) => {
    const status = String(s.status ?? "active").toLowerCase();
    const cancelled = status === "cancelled" || !!s.cancelled_at;
    return !cancelled;
  });

  const withEffective = activeLike
    .map((s: any) => ({
      ...s,
      effective_renewal_date: getEffectiveRenewalDate(s),
    }))
    .filter((s: any) => !!s.effective_renewal_date);

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

  const nextUpcoming = withEffective
    .filter((s: any) => (s.effective_renewal_date as Date) >= today)
    .sort(
      (a: any, b: any) =>
        (a.effective_renewal_date as Date).getTime() -
        (b.effective_renewal_date as Date).getTime()
    )[0];

  const forecastItems = withEffective.filter((s: any) => {
    const d = s.effective_renewal_date as Date;
    return d >= today && d <= in30;
  });

  const expectedTotal = forecastItems.reduce((sum: number, s: any) => {
    const n = typeof s.amount === "number" ? s.amount : Number(s.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

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

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardShell userEmail={user.email ?? ""} dateLabel={dateLabel}>
      <KpiGrid
        total={trackedSubs.length}
        monthly={monthlySpend}
        yearly={yearlySpend}
        nextRenewal={formatDate(nextUpcoming?.effective_renewal_date ?? null)}
        currency={preferredCurrency}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <BreakdownCard
          active={activeCount}
          dueSoon={renewSoonCount}
          expired={expiredCount}
          cancelled={cancelledCount}
        />

        <ForecastCard
          total={expectedTotal}
          currency={preferredCurrency}
          activeCount={activeCount}
          dueSoonCount={renewSoonCount}
        />

        <CategoryCard subs={activeLike as any} currency={preferredCurrency} />
      </div>

      {/* Upcoming renewals */}
      <div className="mt-8">
        <UpcomingRenewalsCard items={upcoming} currency={preferredCurrency} />
      </div>

      {/* ✅ Put Add Subscription + All Subscriptions after upcoming */}
      <div className="mt-10" id="add-subscription">
        <TrackedSubscriptionsSection initialSubs={trackedSubs} />
      </div>
    </DashboardShell>
  );
}