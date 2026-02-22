"use client";

import React, { useMemo } from "react";
import type { TrackedSub } from "./types";
import MerchantIcon from "@/components/MerchantIcon";

export default function PaymentForecast({
  subs,
  preferredCurrency = "USD",
}: {
  subs: TrackedSub[];
  preferredCurrency?: string;
}) {
  const forecast = useMemo(() => {
    const now = startOfDay(new Date());
    const in30 = startOfDay(new Date());
    in30.setDate(in30.getDate() + 30);

    const rows = (subs ?? [])
      .filter((s: any) => {
        const status = String((s as any).status ?? "active").toLowerCase();
        const isCancelled = status === "cancelled" || !!(s as any).cancelled_at;
        if (isCancelled) return false;

        const d = toDateSafe((s as any).renewal_date);
        if (!d) return false;

        const day = startOfDay(d);
        return day.getTime() >= now.getTime() && day.getTime() <= in30.getTime();
      })
      .map((s: any) => {
        const d = toDateSafe(s.renewal_date)!;
        return {
          id: String(s.id ?? crypto.randomUUID()),
          vendor: String(s.merchant_name ?? s.vendor ?? "Subscription"),
          date: startOfDay(d),
          currency: String(s.currency ?? preferredCurrency),
          amount: toNumber(s.amount) ?? null,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    return { rows: rows.slice(0, 10), total, count: rows.length };
  }, [subs, preferredCurrency]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black">Payment Forecast</h2>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
          Next 30 days
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-sm text-black/60">Expected total</div>
        <div className="text-lg font-semibold text-black">
          {preferredCurrency} {forecast.total.toFixed(2)}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {forecast.count === 0 ? (
          <p className="text-sm text-black/60">No payments expected in the next 30 days.</p>
        ) : (
          forecast.rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MerchantIcon name={r.vendor} size={36} className="shrink-0" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.vendor}</div>
                  <div className="text-xs text-black/55">{r.date.toLocaleDateString("en-US")}</div>
                </div>
              </div>

              <div className="shrink-0 text-right text-sm font-semibold">
                {r.currency} {r.amount === null ? "—" : r.amount.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      {forecast.count > forecast.rows.length ? (
        <p className="mt-3 text-xs text-black/45">
          Showing {forecast.rows.length} of {forecast.count} upcoming payments.
        </p>
      ) : null}
    </section>
  );
}

/* helpers */
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