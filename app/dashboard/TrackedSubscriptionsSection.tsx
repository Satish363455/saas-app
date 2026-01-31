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

  // Used for duplicate warning in UI
  const dedupeKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) {
      set.add(makeDedupeKey(s.merchant_name, s.amount, s.currency, s.renewal_date));
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

  // ✅ NEW: mark cancelled / reactivate (PATCH)
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
      <TrackedSubscriptionList
        subs={subs}
        busyId={busyId}
        onDelete={onDelete}
        onToggleCancel={onToggleCancel}
      />

      <div className="mt-6">
        <TrackedSubscriptionForm dedupeKeySet={dedupeKeySet} onCreate={onCreate} />
      </div>
    </div>
  );
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