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

  // ✅ Renewing Soon (next 7 days) — ACTIVE ONLY
  const renewingSoon = useMemo(() => {
    const list = subs
      .filter((s: any) => String(s.status || "").toLowerCase() === "active")
      .map((s: any) => ({
        ...s,
        daysLeft: daysUntil(s.renewal_date),
      }))
      .filter((s: any) => s.daysLeft !== null && s.daysLeft >= 0 && s.daysLeft <= 7)
      .sort((a: any, b: any) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

    return list;
  }, [subs]);

  // Used for duplicate warning in UI
  const dedupeKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs as any[]) {
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
      return { ok: false as const, reason: "duplicate" as const, message: data?.error };
    }

    if (!res.ok) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: data?.error ?? "Failed to add subscription",
      };
    }

    const created: TrackedSub | undefined = data?.sub;

    if ((created as any)?.id) {
      setSubs((prev) => {
        const next = [created, ...prev];
        next.sort((a: any, b: any) =>
          String(a.renewal_date).localeCompare(String(b.renewal_date))
        );
        return next;
      });
    }

    return { ok: true as const };
  };

  const onDelete = async (id: string) => {
    if (!id) return alert("Missing id");
    if (!confirm("Delete this tracked subscription?")) return;

    try {
      setBusyId(id);

      const res = await fetch(
        `/api/tracked-subscriptions?id=${encodeURIComponent(String(id))}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) return alert(data?.error ?? "Failed to delete");

      setSubs((prev) => prev.filter((s: any) => s.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const onToggleCancel = async (id: string, action: "cancel" | "reactivate") => {
    if (!id) return alert("Missing id");

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
      if (!res.ok) return alert(data?.error ?? "Failed to update");

      const updated: TrackedSub | undefined = data?.sub;
      if (!(updated as any)?.id) return;

      setSubs((prev) => prev.map((s: any) => (s.id === (updated as any).id ? updated : s)));
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

/** Helpers */
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

function badgeText(daysLeft: number | null) {
  if (daysLeft === null) return "—";
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "in 1 day";
  return `in ${daysLeft} days`;
}

function normalizeVendor(v: string) {
  return (v || "").trim().toLowerCase();
}
function normalizeDate(dateStr: string) {
  if (!dateStr) return "";
  return dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
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