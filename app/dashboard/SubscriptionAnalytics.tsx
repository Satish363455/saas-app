"use client";

import React, { useMemo } from "react";
import type { TrackedSub } from "./types";

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="text-xs font-semibold text-black/60">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-black">{value}</div>
      {sub ? <div className="mt-1 text-xs text-black/50">{sub}</div> : null}
    </section>
  );
}

export default function SubscriptionAnalytics({
  subs,
  preferredCurrency = "USD",
}: {
  subs: TrackedSub[];
  preferredCurrency?: string;
}) {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());

    // remove cancelled from "live" calculations
    const notCancelled = (subs ?? []).filter((s: any) => {
      const status = String((s as any).status ?? "").toLowerCase();
      const isCancelled = status === "cancelled" || !!(s as any).cancelled_at;
      return !isCancelled;
    });

    let activeCount = 0; // >7 days left
    let renewSoonCount = 0; // 0-7 days
    let expiredCount = 0; // <0 days

    let nextRenewal: Date | null = null; // only >= today

    // Spend totals should include only not-cancelled items
    // (You can choose to exclude expired if you want, but most apps keep it not-cancelled.)
    let monthly = 0;

    for (const s of notCancelled as any[]) {
      const amt = toNumber(s.amount);
      if (amt !== null) monthly += toMonthlyAmount(amt, s.billing_cycle);

      const d = toDateSafe(s.renewal_date);
      if (!d) continue;

      const diff = diffInDays(today, startOfDay(d));

      if (diff < 0) {
        expiredCount += 1;
        continue;
      }

      // upcoming renewal candidate (>= today)
      if (!nextRenewal || d.getTime() < nextRenewal.getTime()) nextRenewal = d;

      if (diff <= 7) renewSoonCount += 1;
      else activeCount += 1;
    }

    const yearly = monthly * 12;

    return {
      activeCount,
      renewSoonCount,
      expiredCount,
      monthly,
      yearly,
      nextRenewal,
    };
  }, [subs]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card
        title="Active subscriptions"
        value={stats.activeCount}
        sub={
          <>
            <span className="text-amber-700">{stats.renewSoonCount} renew soon</span>
            {" · "}
            <span className="text-red-700">{stats.expiredCount} expired</span>
          </>
        }
      />

      <Card
        title="Monthly spend"
        value={`${preferredCurrency} ${stats.monthly.toFixed(2)}`}
        sub="Normalized from billing cycle"
      />

      <Card
        title="Yearly spend"
        value={`${preferredCurrency} ${stats.yearly.toFixed(2)}`}
      />

      <Card
        title="Next renewal"
        value={stats.nextRenewal ? stats.nextRenewal.toLocaleDateString("en-US") : "—"}
        sub={stats.nextRenewal ? "Next upcoming renewal (not expired)" : "No upcoming renewals"}
      />
    </div>
  );
}

/* ---------- helpers ---------- */

function toNumber(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function toDateSafe(v: any) {
  const d = new Date(String(v ?? ""));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffInDays(a: Date, b: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

function toMonthlyAmount(amount: number, billingCycle?: string | null) {
  const c = String(billingCycle ?? "monthly").toLowerCase().trim();

  if (c === "monthly") return amount;
  if (c === "yearly") return amount / 12;

  if (c === "weekly") return (amount * 52) / 12;
  if (c === "every_2_weeks" || c === "2_weeks") return (amount * 26) / 12;

  if (c === "every_3_months" || c === "3_months") return amount / 3;
  if (c === "every_6_months" || c === "6_months") return amount / 6;

  if (c.startsWith("custom:")) {
    const parts = c.split(":");
    const n = Number(parts[1] ?? "1");
    const unit = String(parts[2] ?? "months");
    const safeN = !Number.isNaN(n) && n > 0 ? n : 1;

    if (unit === "days") return amount * (30.437 / safeN);
    if (unit === "months") return amount / safeN;
    if (unit === "years") return amount / (safeN * 12);
  }

  return amount;
}