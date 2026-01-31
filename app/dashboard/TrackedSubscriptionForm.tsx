"use client";

import { useMemo, useState } from "react";

export type CreateTrackedSubPayload = {
  merchant_name: string;
  plan_name?: string | null;
  amount: number | string;
  currency: string;
  renewal_date: string; // YYYY-MM-DD
  notes?: string | null;
};

export default function TrackedSubscriptionForm({
  dedupeKeySet,
  onCreate,
}: {
  dedupeKeySet: Set<string>;
  onCreate: (payload: CreateTrackedSubPayload) => Promise<
    | { ok: true }
    | { ok: false; reason: "duplicate" | "error"; message?: string }
  >;
}) {
  const [merchantName, setMerchantName] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("9.99");
  const [currency, setCurrency] = useState("USD");
  const [renewalDate, setRenewalDate] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const dedupeKey = useMemo(() => {
    return makeDedupeKey(merchantName, amount, currency, renewalDate);
  }, [merchantName, amount, currency, renewalDate]);

  const isPotentialDuplicate = useMemo(() => {
    if (!merchantName || !renewalDate || !amount) return false;
    return dedupeKeySet.has(dedupeKey);
  }, [dedupeKey, dedupeKeySet, merchantName, renewalDate, amount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    // UI warning (doesn’t block, but asks confirmation)
    if (isPotentialDuplicate) {
      const ok = confirm(
        "This looks like a duplicate (same merchant + amount + renewal date). Add anyway?"
      );
      if (!ok) return;
    }

    try {
      setSaving(true);

      const result = await onCreate({
        merchant_name: merchantName.trim(),
        plan_name: planName.trim() ? planName.trim() : null,
        amount,
        currency,
        renewal_date: renewalDate, // must be YYYY-MM-DD
        notes: notes.trim() ? notes.trim() : null,
      });

      if (!result.ok) {
        if (result.reason === "duplicate") {
          setBanner("Duplicate blocked: you already tracked this exact subscription.");
        } else {
          setBanner(result.message ?? "Something went wrong.");
        }
        return;
      }

      // Clear form
      setMerchantName("");
      setPlanName("");
      setAmount("9.99");
      setCurrency("USD");
      setRenewalDate("");
      setNotes("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold">Add a tracked subscription</h3>

      {isPotentialDuplicate ? (
        <div className="mt-2 border rounded-md p-2 opacity-90">
          ⚠️ Looks like a duplicate (same merchant + amount + renewal date).
        </div>
      ) : null}

      {banner ? (
        <div className="mt-2 border rounded-md p-2 opacity-90">{banner}</div>
      ) : null}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm mb-1">Vendor</label>
          <input
            className="border rounded-md p-2 w-full bg-transparent"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Amazon Prime"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Plan (optional)</label>
          <input
            className="border rounded-md p-2 w-full bg-transparent"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Monthly / Annual / Pro / etc"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm mb-1">Amount</label>
            <input
              className="border rounded-md p-2 w-full bg-transparent"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
            />
          </div>

          <div className="w-32">
            <label className="block text-sm mb-1">Currency</label>
            <select
              className="border rounded-md p-2 w-full bg-transparent"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Renewal date</label>
          <input
            type="date"
            className="border rounded-md p-2 w-full bg-transparent"
            value={renewalDate}
            onChange={(e) => setRenewalDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Notes (optional)</label>
          <input
            className="border rounded-md p-2 w-full bg-transparent"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., cancel from Amazon settings page"
          />
        </div>

        <button
          className="border rounded-md px-3 py-2"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : "Add Subscription"}
        </button>
      </form>
    </div>
  );
}

function normalizeVendor(v: string) {
  return v.trim().toLowerCase();
}
function normalizeDate(dateStr: string) {
  if (!dateStr) return "";
  return dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
}
function makeDedupeKey(
  merchant_name: string,
  amount: number | string,
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