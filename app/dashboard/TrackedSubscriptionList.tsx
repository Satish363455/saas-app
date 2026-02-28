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
      <section className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm">
        <div className="text-sm tracking-[0.35em] text-black/40">
          ALL SUBSCRIPTIONS
        </div>
        <p className="mt-3 text-sm text-black/60">No subscriptions yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.35em] text-black/45">
          ALL SUBSCRIPTIONS
        </div>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">
          {subs.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {subs.map((s: any) => {
          const id = String(s.id ?? "");
          const vendor = String(s.merchant_name ?? "Subscription");
          const isBusy = busyId === id;

          const statusRaw = String(s.status ?? "active").toLowerCase();
          const isCancelled = statusRaw === "cancelled" || !!s.cancelled_at;

          const eff: Date | null = s.effective_renewal_date ?? null;
          const daysLeft: number | null = s.daysLeft ?? null;

          const state = getState({ isCancelled, eff, daysLeft });

          return (
            <div
              key={id}
              className="rounded-2xl border border-black/5 bg-white/60 px-4 py-4"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4">
                {/* Left: icon + text */}
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-2xl border border-black/10 bg-white p-2">
                    <MerchantIcon name={vendor} size={28} className="shrink-0" />
                  </div>

                  <div className="min-w-0">
                    {/* Row 1: Name + Status (NO days pill here) */}
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate text-sm font-semibold text-black">
                        {vendor}
                      </div>
                      <StatusChip state={state} />
                    </div>

                    {/* Row 2: Price + Date */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/50">
                      <span>
                        {String(s.currency ?? "USD")} {formatAmount(s.amount)}
                      </span>

                      <span aria-hidden className="text-black/25">
                        •
                      </span>

                      <span>{formatUSDate(eff) || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Right: days pill in top-right corner */}
                <div className="shrink-0 pt-0.5">
                  <DaysPill state={state} daysLeft={daysLeft} />
                </div>
              </div>

              {/* Actions - ALWAYS VISIBLE */}
              <div className="mt-4 flex flex-wrap gap-2">
                {!isCancelled ? (
                  <button
                    type="button"
                    onClick={() => onToggleCancel(id, "cancel")}
                    disabled={isBusy}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/80 hover:bg-black/5 disabled:opacity-60"
                  >
                    {isBusy ? "Working..." : "Mark Cancelled"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleCancel(id, "reactivate")}
                    disabled={isBusy}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/80 hover:bg-black/5 disabled:opacity-60"
                  >
                    {isBusy ? "Working..." : "Reactivate"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(id)}
                  disabled={isBusy}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/80 hover:bg-black/5 disabled:opacity-60"
                >
                  {isBusy ? "Working..." : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-black/45">
        Cancel stops reminders only
      </p>
    </section>
  );
}

/* ---------------- UI helpers ---------------- */

function getState({
  isCancelled,
  eff,
  daysLeft,
}: {
  isCancelled: boolean;
  eff: Date | null;
  daysLeft: number | null;
}) {
  if (isCancelled) return "cancelled" as const;
  if (!eff || daysLeft === null) return "invalid" as const;
  if (daysLeft < 0) return "expired" as const;
  if (daysLeft <= 7) return "renews_soon" as const;
  return "active" as const;
}

function StatusChip({
  state,
}: {
  state: "cancelled" | "expired" | "renews_soon" | "active" | "invalid";
}) {
  if (state === "cancelled") {
    return (
      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-black/55">
        Cancelled
      </span>
    );
  }
  if (state === "expired") {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
        Expired
      </span>
    );
  }
  if (state === "renews_soon") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
        Renews soon
      </span>
    );
  }
  if (state === "invalid") {
    return (
      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-black/55">
        Invalid date
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
      Active
    </span>
  );
}

function DaysPill({
  state,
  daysLeft,
}: {
  state: "cancelled" | "expired" | "renews_soon" | "active" | "invalid";
  daysLeft: number | null;
}) {
  if (state === "cancelled" || state === "invalid" || daysLeft === null) {
    return (
      <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/45">
        —
      </span>
    );
  }

  if (state === "expired") {
    const d = Math.abs(daysLeft);
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Expired {d} day{d === 1 ? "" : "s"} ago
      </span>
    );
  }

  if (daysLeft === 0) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
        Due today
      </span>
    );
  }

  // renews soon
  if (state === "renews_soon") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {daysLeft} day{daysLeft === 1 ? "" : "s"} left
      </span>
    );
  }

  // active
  return (
    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/60">
      {daysLeft} day{daysLeft === 1 ? "" : "s"} left
    </span>
  );
}

/* ---------------- formatting ---------------- */

function formatUSDate(d: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString("en-US");
}

function formatAmount(amount: any) {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}