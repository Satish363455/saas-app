// app/dashboard/TrackedSubscriptionList.tsx
"use client";

import React from "react";
import type { TrackedSub } from "./types";
import MerchantIcon from "@/app/components/MerchantIcon";

type Props = {
  subs: TrackedSub[];
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
          const plan = String(s.plan_name ?? s.plan ?? "Subscription");

          const status = String(s.status ?? "active").toLowerCase();
          const isCancelled = status === "cancelled" || !!s.cancelled_at;
          const isBusy = busyId === id;

          const daysLeft = daysUntil(s.renewal_date);
          const renewsSoon =
            !isCancelled && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

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
                {/* Left side */}
                <div className="flex min-w-0 items-start gap-3">
                  <MerchantIcon name={vendor} size={40} className="shrink-0" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-base font-semibold text-black">
                        {vendor}
                      </div>

                      {/* Renews soon pill */}
                      {renewsSoon && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-xs text-black/70">
                          <span aria-hidden>⚠️</span> Renews soon
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 truncate text-sm text-black/55">
                      {currency} {amountText} · Status:{" "}
                      <span className="font-medium text-black/70">
                        {isCancelled ? "cancelled" : "active"}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-black/55">
                      Renews on{" "}
                      <span className="font-medium text-black/70">
                        {formatDate(s.renewal_date)}
                      </span>
                      {daysLeft !== null && !isCancelled ? (
                        <span className="text-black/50">
                          {" "}
                          ({daysLeft} day{daysLeft === 1 ? "" : "s"} left)
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right side badges */}
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${
                      isCancelled
                        ? "border-black/10 bg-white text-black/55"
                        : "border-black/10 bg-white text-black/70"
                    }`}
                  >
                    {isCancelled ? "cancelled" : "active"}
                  </span>
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

              {/* small helper text */}
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

/* Helpers */

function daysUntil(dateInput: string | Date) {
  const today = new Date();
  const target = new Date(dateInput);

  if (Number.isNaN(target.getTime())) return null;

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString();
}

function formatAmount(amount: any) {
  if (typeof amount === "number") return amount.toFixed(2);
  if (typeof amount === "string" && amount.trim() !== "" && !Number.isNaN(Number(amount))) {
    return Number(amount).toFixed(2);
  }
  return "—";
}