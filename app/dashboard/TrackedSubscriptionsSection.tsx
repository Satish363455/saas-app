// app/dashboard/TrackedSubscriptionsSection.tsx
"use client";

import { useMemo, useState } from "react";
import TrackedSubscriptionList from "./TrackedSubscriptionList";
import TrackedSubscriptionForm, {
  CreateTrackedSubPayload,
} from "./TrackedSubscriptionForm";
import type { TrackedSub } from "./types";

export default function TrackedSubscriptionsSection({
  initialSubs,
}: {
  initialSubs: TrackedSub[];
}) {
  const [subs, setSubs] = useState<TrackedSub[]>(initialSubs ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ✅ NEW: Renewing Soon (in-app alerts)
  // Shows active subscriptions renewing in the next 7 days
  const renewingSoon = useMemo(() => {
    return subs
      .filter((s) => s.status === "active")
      .map((s) => ({
        ...s,
        daysLeft: daysUntil(s.renewal_date),
      }))
      .filter((s) => s.daysLeft >= 0 && s.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subs]);

  // Used for duplicate warning in UI
  const dedupeKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) {
      set.add(
        makeDedupeKey(s.merchant_name, s.amount, s.currency, s.renewal_date)
      );
    }
    return set;
  }, [subs]);

  const onCreate = async (payload: CreateTrackedSubPayload) => {
    const res = await fetch("/api/tracked-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 409) {
      return {
        ok: false as const,
        reason: "duplicate" as const,
        message: data?.error,
      };
    }

    if (!res.ok) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: data?.error ?? "Failed to add subscription",
      };
    }

    // ✅ API returns { sub: insertedRow }
    const created: TrackedSub | undefined = data?.sub;

    if (created?.id) {
      setSubs((prev) => {
        const next = [created, ...prev];
        // keep sorted by renewal_date
        next.sort((a, b) =>
          String(a.renewal_date).localeCompare(String(b.renewal_date))
        );
        return next;
      });
    }

    return { ok: true as const };
  };

  const onDelete = async (id: string) => {
    if (!id) {
      alert("Missing id");
      return;
    }
    if (!confirm("Delete this tracked subscription?")) return;

    try {
      setBusyId(id);

      const res = await fetch(
        `/api/tracked-subscriptions?id=${encodeURIComponent(String(id))}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Failed to delete");
        return;
      }

      // ✅ instant UI update (no reload)
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  // ✅ mark cancelled / reactivate (PATCH)
  const onToggleCancel = async (
    id: string,
    action: "cancel" | "reactivate"
  ) => {
    if (!id) {
      alert("Missing id");
      return;
    }

    try {
      setBusyId(id);

      const res = await fetch(
        `/api/tracked-subscriptions?id=${encodeURIComponent(String(id))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Failed to update");
        return;
      }

      const updated: TrackedSub | undefined = data?.sub;
      if (!updated?.id) return;

      // ✅ instant UI update (no reload)
      setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-4">
      {/* ✅ NEW: In-app reminders section */}
      {renewingSoon.length > 0 && (
        <div className="border border-white/20 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Renewing Soon</h3>

          <div className="space-y-2">
            {renewingSoon.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{s.merchant_name}</span>{" "}
                  <span className="opacity-70">
                    renews in {s.daysLeft} day{s.daysLeft === 1 ? "" : "s"}
                  </span>
                </div>

                <span className="px-2 py-1 rounded border border-white/20 text-xs">
                  {formatDate(s.renewal_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TrackedSubscriptionList
        subs={subs}
        busyId={busyId}
        onDelete={onDelete}
        onToggleCancel={onToggleCancel}
      />

      <div className="mt-6">
        <TrackedSubscriptionForm
          dedupeKeySet={dedupeKeySet}
          onCreate={onCreate}
        />
      </div>
    </div>
  );
}

/** ✅ NEW helpers (local to this file for simplicity) */
function daysUntil(dateInput: string | Date) {
  const today = new Date();
  const target = new Date(dateInput);

  // normalize to midnight to avoid timezone issues
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

function normalizeVendor(v: string) {
  return v.trim().toLowerCase();
}

function normalizeDate(dateStr: string) {
  if (!dateStr) return "";
  return dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr; // YYYY-MM-DD
}

function makeDedupeKey(
  merchant_name: string,
  amount: number,
  currency: string,
  renewal_date: string
) {
  return [
    normalizeVendor(merchant_name),
    String(Number(amount).toFixed(2)),
    (currency || "").trim().toUpperCase(),
    normalizeDate(renewal_date),
  ].join("|");
}