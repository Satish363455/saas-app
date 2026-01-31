// app/dashboard/TrackedSubscriptionList.tsx
"use client";

import { useMemo } from "react";
import type { TrackedSub } from "./types";

function parseRenewalDate(dateStr: string) {
  const d = dateStr.includes("T")
    ? new Date(dateStr)
    : new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(dateStr: string) {
  const target = parseRenewalDate(dateStr);
  if (!target) return null;

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  const diffMs = startTarget.getTime() - startToday.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const d = parseRenewalDate(dateStr);
  return d ? d.toLocaleDateString() : dateStr;
}

export default function TrackedSubscriptionList({
  subs,
  busyId,
  onDelete,
  onToggleCancel,
}: {
  subs: TrackedSub[];
  busyId: string | null;
  onDelete: (id: string) => void;
  onToggleCancel: (id: string, nextAction: "cancel" | "reactivate") => void;
}) {
  const sorted = useMemo(() => {
    const list = Array.isArray(subs) ? [...subs] : [];
    list.sort((a, b) => {
      const da = parseRenewalDate(a.renewal_date)?.getTime() ?? 0;
      const db = parseRenewalDate(b.renewal_date)?.getTime() ?? 0;
      return da - db;
    });
    return list;
  }, [subs]);

  if (sorted.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Tracked Subscriptions</h2>
        <p className="mt-2 opacity-70">No tracked subscriptions yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold">Tracked Subscriptions</h2>

      <div className="mt-3 space-y-3">
        {sorted.map((s) => {
          const left = daysUntil(s.renewal_date);

          const leftText =
            left === null
              ? "—"
              : left < 0
              ? `${Math.abs(left)} days ago`
              : `${left} day${left === 1 ? "" : "s"} left`;

          const isCancelled =
            String(s.status).toLowerCase() === "cancelled" || !!(s as any).cancelled_at;

          return (
            <div key={s.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold">{s.merchant_name}</div>

                <span className="text-sm border rounded px-2 py-1 opacity-90">
                  {isCancelled ? "cancelled" : "active"}
                </span>
              </div>

              <div className="mt-1 opacity-80">
                {s.currency} {Number(s.amount).toFixed(2)}
                {s.plan_name ? ` • Plan: ${s.plan_name}` : ""} • Status: {s.status}
              </div>

              <div className="mt-1 opacity-80">
                Renews on {formatDate(s.renewal_date)} ({leftText})
              </div>

              {s.notes ? (
                <div className="mt-2 opacity-80">Notes: {s.notes}</div>
              ) : null}

              <div className="mt-3 flex gap-3">
                <button
                  className="border rounded-md px-3 py-2"
                  onClick={() =>
                    onToggleCancel(s.id, isCancelled ? "reactivate" : "cancel")
                  }
                  disabled={busyId === s.id}
                >
                  {busyId === s.id
                    ? "Updating..."
                    : isCancelled
                    ? "Reactivate"
                    : "Mark Cancelled"}
                </button>

                <button
                  className="border rounded-md px-3 py-2"
                  onClick={() => onDelete(s.id)}
                  disabled={busyId === s.id}
                >
                  {busyId === s.id ? "Working..." : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}