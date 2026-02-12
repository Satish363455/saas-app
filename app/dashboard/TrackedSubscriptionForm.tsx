// app/dashboard/TrackedSubscriptionForm.tsx
"use client";

import React, { useMemo, useState } from "react";

export type CreateTrackedSubPayload = {
  merchant_name: string;
  amount: number | string;
  currency: string;
  renewal_date: string; // YYYY-MM-DD (computed next renewal)
  notes?: string | null;
  billing_cycle?: string | null; // e.g. "monthly", "3_months", "custom:3:months"
  start_date?: string | null; // YYYY-MM-DD
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

  // Billing / dates
  const [billingCycle, setBillingCycle] = useState("monthly"); // default
  const [customIntervalNumber, setCustomIntervalNumber] = useState(3); // used when custom
  const [customIntervalUnit, setCustomIntervalUnit] = useState<
    "days" | "months" | "years"
  >("months");
  const [startDate, setStartDate] = useState<string>(toInputDateString(new Date()));

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // compute the next renewal from startDate + billingCycle
  const computedNextRenewal = useMemo(() => {
    try {
      return computeNextRenewal(startDate, billingCycle, {
        customNumber: customIntervalNumber,
        customUnit: customIntervalUnit,
      });
    } catch (err) {
      return "";
    }
  }, [startDate, billingCycle, customIntervalNumber, customIntervalUnit]);

  // dedupe key uses the computed renewal_date (so duplicates of same cycle date are detected)
  const dedupeKey = useMemo(() => {
    return makeDedupeKey(merchantName, amount, currency, computedNextRenewal);
  }, [merchantName, amount, currency, computedNextRenewal]);

  const isPotentialDuplicate = useMemo(() => {
    if (!merchantName || !computedNextRenewal || !amount) return false;
    return dedupeKeySet.has(dedupeKey);
  }, [dedupeKey, dedupeKeySet, merchantName, computedNextRenewal, amount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    if (isPotentialDuplicate) {
      const ok = confirm(
        "This looks like a duplicate (same merchant + amount + renewal date). Add anyway?"
      );
      if (!ok) return;
    }

    try {
      setSaving(true);

      // Build billing_cycle string to store (useful for server)
      let billing_cycle_payload: string | null = null;
      if (billingCycle === "custom") {
        billing_cycle_payload = `custom:${customIntervalNumber}:${customIntervalUnit}`;
      } else {
        billing_cycle_payload = billingCycle;
      }

      const payload: CreateTrackedSubPayload = {
        merchant_name: merchantName.trim(),
        plan_name: planName.trim() ? planName.trim() : null,
        amount,
        currency,
        renewal_date: computedNextRenewal, // YYYY-MM-DD
        notes: notes.trim() ? notes.trim() : null,
        billing_cycle: billing_cycle_payload,
        start_date: startDate ? normalizeDate(startDate) : null,
      };

      const result = await onCreate(payload);

      if (!result.ok) {
        if (result.reason === "duplicate") {
          setBanner("Duplicate blocked: you already tracked this exact subscription.");
        } else {
          setBanner(result.message ?? "Something went wrong.");
        }
        return;
      }

      // clear
      setMerchantName("");
      setAmount("9.99");
      setCurrency("USD");
      setBillingCycle("monthly");
      setCustomIntervalNumber(3);
      setCustomIntervalUnit("months");
      setStartDate(toInputDateString(new Date()));
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold">Add a tracked subscription</h3>

      {isPotentialDuplicate ? (
        <div className="mt-2 border rounded-md p-2 bg-yellow-50 text-sm text-amber-800">
          ⚠️ Looks like a duplicate (same merchant + amount + renewal date).
        </div>
      ) : null}

      {banner ? (
        <div className="mt-2 border rounded-md p-2">{banner}</div>
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

        {/* Billing cycle */}
        <div>
          <label className="block text-sm mb-1">Billing cycle</label>
          <select
            className="border rounded-md p-2 w-full bg-transparent"
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="every_2_weeks">2 weeks</option>
            <option value="monthly">Monthly</option>
            <option value="every_3_months">3 months</option>
            <option value="every_6_months">6 months</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom interval...</option>
          </select>
        </div>

        {/* Custom interval UI */}
        {billingCycle === "custom" ? (
          <div className="flex gap-2 items-center">
            <div className="w-24">
              <input
                type="number"
                min={1}
                className="border rounded-md p-2 w-full bg-transparent"
                value={String(customIntervalNumber)}
                onChange={(e) => {
                  const v = Number(e.target.value || 1);
                  setCustomIntervalNumber(v < 1 ? 1 : v);
                }}
              />
            </div>

            <div className="flex-1">
              <select
                className="border rounded-md p-2 w-full bg-transparent"
                value={customIntervalUnit}
                onChange={(e) =>
                  setCustomIntervalUnit(e.target.value as "days" | "months" | "years")
                }
              >
                <option value="days">days</option>
                <option value="months">months</option>
                <option value="years">years</option>
              </select>
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-sm mb-1">Start date</label>
          <input
            type="date"
            className="border rounded-md p-2 w-full bg-transparent"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Next renewal</label>
          <div className="rounded-md border p-2 bg-gray-50 text-right font-medium">
            {computedNextRenewal ? computedNextRenewal : "—"}
          </div>
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

        <div className="flex gap-2">
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Add Subscription"}
          </button>

          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-black/5"
            onClick={() => {
              // reset to defaults
              setMerchantName("");
              setAmount("9.99");
              setCurrency("USD");
              setBillingCycle("monthly");
              setCustomIntervalNumber(3);
              setCustomIntervalUnit("months");
              setStartDate(toInputDateString(new Date()));
              setNotes("");
              setBanner(null);
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Helpers ---------- */

// Compute the next renewal date (YYYY-MM-DD) given a start date and a billing cycle.
// billingCycle examples:
// - "weekly", "2_weeks", "monthly", "3_months", "6_months", "yearly", "custom"
function computeNextRenewal(
  startDateInput: string,
  billingCycle: string,
  opts: { customNumber: number; customUnit: "days" | "months" | "years" }
) {
  // Normalize input
  const startISO = normalizeDate(startDateInput);
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return "";

  // find the next renewal date strictly >= today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let candidate = new Date(start);
  candidate.setHours(0, 0, 0, 0);

  // helper to step candidate forward
  const step = (n: number, unit: "days" | "months" | "years") => {
    if (unit === "days") {
      candidate = addDays(candidate, n);
    } else if (unit === "months") {
      candidate = addMonths(candidate, n);
    } else {
      candidate = addYears(candidate, n);
    }
  };

  // choose step size based on billingCycle
  let stepN = 1;
  let stepUnit: "days" | "months" | "years" = "months";

  switch (billingCycle) {
    case "weekly":
      stepN = 1;
      stepUnit = "days";
      // weekly handled as 7 days per step
      stepUnit = "days";
      break;
    case "2_weeks":
      stepN = 14;
      stepUnit = "days";
      break;
    case "monthly":
      stepN = 1;
      stepUnit = "months";
      break;
    case "3_months":
      stepN = 3;
      stepUnit = "months";
      break;
    case "6_months":
      stepN = 6;
      stepUnit = "months";
      break;
    case "yearly":
      stepN = 1;
      stepUnit = "years";
      break;
    case "custom":
      // customNumber/customUnit passed in opts
      stepN = Math.max(1, Math.floor(opts.customNumber));
      stepUnit = opts.customUnit;
      break;
    default:
      // default to monthly
      stepN = 1;
      stepUnit = "months";
  }

  // If weekly (1 week) we treat as 7 days
  if (billingCycle === "weekly") {
    stepN = 7;
    stepUnit = "days";
  }

  // If candidate (start) is already >= today, return candidate; otherwise iterate
  if (candidate.getTime() >= today.getTime()) {
    return toYYYYMMDD(candidate);
  }

  // else advance until candidate >= today
  // to avoid infinite loops, cap iterations
  let iterations = 0;
  while (candidate.getTime() < today.getTime() && iterations < 1000) {
    step(stepN, stepUnit);
    iterations += 1;
  }

  return toYYYYMMDD(candidate);
}

/* small date helpers */

function toInputDateString(d: Date) {
  // YYYY-MM-DD (for <input type="date"> value)
  return toYYYYMMDD(d);
}
function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function normalizeDate(dateStr: string) {
  // Accepts YYYY-MM-DD or Date-like string; return YYYY-MM-DD
  if (!dateStr) return "";
  // if already YYYY-MM-DD, quick path
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return toYYYYMMDD(d);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number) {
  const r = new Date(d);
  const day = r.getDate();
  r.setMonth(r.getMonth() + n);

  // handle month overflow (e.g., Jan 31 + 1 month -> Feb 28/29)
  if (r.getDate() < day) {
    // clamp to end of month
    r.setDate(0);
  }
  return r;
}
function addYears(d: Date, n: number) {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

/* dedupe util (same as your earlier helper) */
function normalizeVendor(v: string) {
  return v.trim().toLowerCase();
}
function makeDedupeKey(
  merchant_name: string,
  amount: number | string,
  currency: string,
  renewal_date: string
) {
  return [
    normalizeVendor(merchant_name || ""),
    String(Number(amount || "0").toFixed(2)),
    (currency || "").trim().toUpperCase(),
    normalizeDate(renewal_date || ""),
  ].join("|");
}