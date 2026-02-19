"use client";

import React from "react";
import StatusDonutChartClient from "./StatusDonutChartClient";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";

type Props = {
  subs?: any[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Parse YYYY-MM-DD as LOCAL date (prevents timezone -1 day bug)
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

  // Otherwise parse normally
  const d = new Date(next as any);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

export default function SubscriptionAnalytics({ subs = [] }: Props) {
  const today = startOfDay(new Date());
  const in7 = startOfDay(new Date());
  in7.setDate(in7.getDate() + 7);

  const cancelledCount = subs.filter((s) => {
    const status = String(s.status ?? "").toLowerCase();
    return status === "cancelled" || !!s.cancelled_at;
  }).length;

  const activeLike = subs.filter((s) => {
    const status = String(s.status ?? "active").toLowerCase();
    const cancelled = status === "cancelled" || !!s.cancelled_at;
    return !cancelled;
  });

  const expiredCount = activeLike.filter((s) => {
    const d = getEffectiveRenewalDate(s);
    if (!d) return false;
    return d < today;
  }).length;

  const renewSoonCount = activeLike.filter((s) => {
    const d = getEffectiveRenewalDate(s);
    if (!d) return false;
    return d >= today && d <= in7;
  }).length;

  const activeCount = activeLike.filter((s) => {
    const d = getEffectiveRenewalDate(s);
    if (!d) return false;
    return d >= today;
  }).length;

  const hasAny = activeCount + renewSoonCount + expiredCount + cancelledCount > 0;

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold text-black">Subscription Analytics</h2>
      <p className="mt-1 text-xs text-black/50">
        Quick breakdown based on your tracked subscriptions
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/50">Active</div>
          <div className="mt-2 text-2xl font-semibold">{activeCount}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/50">Renews soon</div>
          <div className="mt-2 text-2xl font-semibold">{renewSoonCount}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/50">Expired</div>
          <div className="mt-2 text-2xl font-semibold">{expiredCount}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/50">Cancelled</div>
          <div className="mt-2 text-2xl font-semibold">{cancelledCount}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
        {hasAny ? (
          <StatusDonutChartClient
            active={activeCount}
            renewSoon={renewSoonCount}
            expired={expiredCount}
            cancelled={cancelledCount}
          />
        ) : (
          <div className="text-sm text-black/60">No subscriptions yet.</div>
        )}
      </div>
    </section>
  );
}