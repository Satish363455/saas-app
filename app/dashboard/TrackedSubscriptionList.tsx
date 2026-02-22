"use client";

import React from "react";
import type { TrackedSub } from "./types";
import MerchantIcon from "@/components/MerchantIcon";

type Props = {
  subs: (TrackedSub & {
    effective_renewal_date?: Date | null;
    daysLeft?: number | null;
  })[];
  busyId: string | null;
  onDelete: (id: string) => void;
  onToggleCancel: (id: string, action: "cancel" | "reactivate") => void;
};

export default function TrackedSubscriptionList({
  subs,
  busyId,
  onDelete,
  onToggleCancel,
}: Props) {
  if (!subs || subs.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h3 className="text-base font-semibold text-black">Tracked Subscriptions</h3>
        <p className="mt-2 text-sm text-black/60">No subscriptions yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-black">Tracked Subscriptions</h3>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
          {subs.length} total
        </span>
      </div>

      <div className="space-y-3">
        {subs.map((s: any) => {
          const id = String(s.id ?? "");
          const vendor = String(s.merchant_name ?? s.vendor ?? "Subscription");

          const status = String(s.status ?? "active").toLowerCase();
          const isCancelled = status === "cancelled" || !!s.cancelled_at;
          const isBusy = busyId === id;

          // ✅ from TrackedSubscriptionsSection (Smart Renewal Engine)
          const eff: Date | null = s.effective_renewal_date ?? null;
          const diffDays: number | null = s.daysLeft ?? null;
          const isInvalidDate = !eff || diffDays === null;

          let state: "cancelled" | "expired" | "renews_soon" | "active" | "invalid" =
            "active";

          if (isCancelled) state = "cancelled";
          else if (isInvalidDate) state = "invalid";
          else if (diffDays < 0) state = "expired";
          else if (diffDays <= 7) state = "renews_soon";
          else state = "active";

          const currency = String(s.currency ?? "USD");
          const amountText = formatAmount(s.amount);

          return (
            <div
              key={id}
              className={`rounded-2xl border border-black/10 bg-white px-4 py-4 ${
                isCancelled ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex min-w-0 items-start gap-3">
                  <MerchantIcon name={vendor} size={40} className="shrink-0" />

                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-black">
                      {vendor}
                    </div>

                    <div className="mt-0.5 truncate text-sm text-black/55">
                      {currency} {amountText}
                    </div>

                    <div className="mt-1 text-sm text-black/55">
                      Renews on{" "}
                      <span className="font-medium text-black/70">
                        {formatDateFromDate(eff)}
                      </span>
                      {renderRelativeDays(diffDays, state)}
                    </div>
                  </div>
                </div>

                {/* Right badge */}
                <div className="flex shrink-0 items-start">
                  <StatusBadge state={state} />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {!isCancelled ? (
                  <button
                    type="button"
                    onClick={() => onToggleCancel(id, "cancel")}
                    disabled={isBusy}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
                    title="Mark this subscription as cancelled (it will not be deleted)"
                  >
                    {isBusy ? "Working..." : "Mark Cancelled"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleCancel(id, "reactivate")}
                    disabled={isBusy}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
                    title="Reactivate this subscription"
                  >
                    {isBusy ? "Working..." : "Reactivate"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(id)}
                  disabled={isBusy}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
                >
                  {isBusy ? "Working..." : "Delete"}
                </button>
              </div>

              <p className="mt-2 text-xs text-black/45">
                Mark Cancelled does <span className="font-medium">not</span>{" "}
                delete — it just stops reminders and marks it cancelled.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Badge ---------- */

function StatusBadge({
  state,
}: {
  state: "cancelled" | "expired" | "renews_soon" | "active" | "invalid";
}) {
  if (state === "cancelled") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/60">
        <span className="h-2 w-2 rounded-full bg-zinc-400" />
        Cancelled
      </span>
    );
  }

  if (state === "expired") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-600" />
        Expired
      </span>
    );
  }

  if (state === "renews_soon") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs text-amber-800">
        <span aria-hidden>⚠️</span>
        Renews soon
      </span>
    );
  }

  if (state === "invalid") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/60">
        <span className="h-2 w-2 rounded-full bg-zinc-400" />
        Invalid date
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-600" />
      Active
    </span>
  );
}

/* ---------- Helpers ---------- */

function renderRelativeDays(diffDays: number | null, state: string) {
  if (diffDays === null) return null;
  if (state === "invalid") return null;

  if (state === "expired") {
    const daysAgo = Math.abs(diffDays);
    return (
      <span className="text-black/50">
        {" "}
        (expired {daysAgo} day{daysAgo === 1 ? "" : "s"} ago)
      </span>
    );
  }

  if (diffDays === 0) return <span className="text-black/50"> (today)</span>;

  return (
    <span className="text-black/50">
      {" "}
      ({diffDays} day{diffDays === 1 ? "" : "s"} left)
    </span>
  );
}

function formatDateFromDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US");
}

function formatAmount(amount: any) {
  if (typeof amount === "number") return amount.toFixed(2);
  if (
    typeof amount === "string" &&
    amount.trim() !== "" &&
    !Number.isNaN(Number(amount))
  ) {
    return Number(amount).toFixed(2);
  }
  return "—";
}