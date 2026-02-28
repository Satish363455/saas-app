"use client";

import { useMemo, useState } from "react";
import TrackedSubscriptionList from "./TrackedSubscriptionList";
import TrackedSubscriptionForm, {
  CreateTrackedSubPayload,
} from "./TrackedSubscriptionForm";
import type { TrackedSub } from "./types";
import { effectiveNextRenewal } from "@/lib/subscriptions/effectiveNextRenewal";
import { parseLocalYMD } from "@/lib/date";

export default function TrackedSubscriptionsSection({
  initialSubs,
}: {
  initialSubs: TrackedSub[];
}) {
  const [subs, setSubs] = useState<TrackedSub[]>(initialSubs ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ✅ Attach effective date + daysLeft (Smart Renewal Engine)
  const subsWithEffective = useMemo(() => {
    const today = startOfDay(new Date());

    return (subs ?? []).map((s: any) => {
      const eff = getEffectiveRenewalDate(s);
      const daysLeft = eff ? daysUntilDate(eff, today) : null;

      return {
        ...s,
        effective_renewal_date: eff, // Date | null
        daysLeft, // number | null
      };
    });
  }, [subs]);

  // Used for duplicate warning in UI
  const dedupeKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs as any[]) {
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

    const created = (data as any)?.sub as TrackedSub | undefined;

    if (!created?.id) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: (data as any)?.error ?? "Create failed",
      };
    }

    setSubs((prev) => {
      const next: TrackedSub[] = [created, ...prev];
      next.sort((a, b) =>
        String(a.renewal_date).localeCompare(String(b.renewal_date))
      );
      return next;
    });

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

      setSubs((prev) =>
        prev.map((s: any) => (s.id === (updated as any).id ? updated : s))
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-4 space-y-8">
      {/* ✅ FORM FIRST */}
      <div id="add-subscription">
        <TrackedSubscriptionForm
          dedupeKeySet={dedupeKeySet}
          onCreate={onCreate}
        />
      </div>

      {/* ✅ LIST AFTER */}
      <TrackedSubscriptionList
        subs={subsWithEffective as any}
        busyId={busyId}
        onDelete={onDelete}
        onToggleCancel={onToggleCancel}
      />
    </div>
  );
}

/* ---------------- Smart Renewal Helpers ---------------- */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getEffectiveRenewalDate(s: any): Date | null {
  const next = effectiveNextRenewal({
    renewalDate: s.renewal_date,
    billingCycle: s.billing_cycle,
    cancelled:
      String(s.status ?? "").toLowerCase() === "cancelled" || !!s.cancelled_at,
  });

  if (!next) return null;

  // If engine returned YYYY-MM-DD (date-only) parse as LOCAL to avoid UTC-shift
  if (typeof next === "string" && /^\d{4}-\d{2}-\d{2}$/.test(next)) {
    const parsed = parseLocalYMD(next); // returns new Date(y,m-1,d)
    if (Number.isNaN(parsed.getTime())) return null;
    return startOfDay(parsed);
  }

  // Otherwise assume it's an ISO timestamp
  const d = new Date(String(next));
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function daysUntilDate(target: Date, todayBase?: Date) {
  const today = todayBase ? startOfDay(todayBase) : startOfDay(new Date());
  const t = startOfDay(target);
  const diffMs = t.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/* ---------------- Existing Helpers (dedupe etc) ---------------- */

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