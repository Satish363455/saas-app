// app/dashboard/TrackedSubscriptionForm.tsx
"use client";

import React, { useMemo, useState } from "react";

type CustomUnit = "days" | "months" | "years";

export type CreateTrackedSubPayload = {
  merchant_name: string;
  plan_name?: string | null;
  amount: number;
  currency: string;
  renewal_date: string; // YYYY-MM-DD
  billing_cycle?: string | null;

  custom_interval_value?: number | null;
  custom_interval_unit?: CustomUnit | null;

  status?: string;
  notes?: string | null;
  start_date?: string | null;

  remind_days_before?: number | null;
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

  const [billingCycle, setBillingCycle] = useState<
    "weekly" | "every_2_weeks" | "monthly" | "every_3_months" | "every_6_months" | "yearly" | "custom"
  >("monthly");

  const [customIntervalNumber, setCustomIntervalNumber] = useState(3);
  const [customIntervalUnit, setCustomIntervalUnit] = useState<CustomUnit>("months");

  const [startDate, setStartDate] = useState<string>(toInputDateString(new Date()));
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const computedNextRenewal = useMemo(() => {
    try {
      return computeNextRenewal(startDate, billingCycle, {
        customNumber: customIntervalNumber,
        customUnit: customIntervalUnit,
      });
    } catch {
      return "";
    }
  }, [startDate, billingCycle, customIntervalNumber, customIntervalUnit]);

  const dedupeKey = useMemo(() => {
    return makeDedupeKey(merchantName, Number(amount), currency, computedNextRenewal);
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

    setSaving(true);
    try {
      const amountNumber = Number(amount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        setBanner("Amount must be a positive number");
        return;
      }

      const payload: CreateTrackedSubPayload = {
        merchant_name: merchantName.trim(),
        plan_name: planName.trim() ? planName.trim() : null,
        amount: amountNumber,
        currency: currency.trim().toUpperCase(),
        renewal_date: computedNextRenewal,
        notes: notes.trim() ? notes.trim() : null,
        billing_cycle: billingCycle,
        start_date: startDate ? normalizeYMD(startDate) : null,
      };

      if (billingCycle === "custom") {
        payload.custom_interval_value = Math.max(1, Math.floor(Number(customIntervalNumber || 1)));
        payload.custom_interval_unit = customIntervalUnit;
      } else {
        payload.custom_interval_value = null;
        payload.custom_interval_unit = null;
      }

      const result = await onCreate(payload);

      if (!result.ok) {
        setBanner(result.message ?? "Something went wrong.");
        return;
      }

      // reset
      setMerchantName("");
      setPlanName("");
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

      {banner ? <div className="mt-2 border rounded-md p-2">{banner}</div> : null}

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
            placeholder="Prime Monthly / Basic"
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
          <label className="block text-sm mb-1">Billing cycle</label>
          <select
            className="border rounded-md p-2 w-full bg-transparent"
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as any)}
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
                onChange={(e) => setCustomIntervalUnit(e.target.value as CustomUnit)}
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
              setMerchantName("");
              setPlanName("");
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

/* ---------------- Date helpers (timezone-safe) ---------------- */

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseLocalYMD(ymd: string) {
  // IMPORTANT: parse YYYY-MM-DD in LOCAL time (prevents UTC shifting)
  if (!isYMD(ymd)) return new Date(ymd);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function normalizeYMD(dateStr: string) {
  // input type="date" already returns YYYY-MM-DD, keep it
  if (!dateStr) return "";
  if (isYMD(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return toYYYYMMDD(d);
}

function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toInputDateString(d: Date) {
  return toYYYYMMDD(d);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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
  if (r.getDate() < day) r.setDate(0);
  return r;
}
function addYears(d: Date, n: number) {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

/**
 * ✅ Computes NEXT renewal = start + interval (not start itself)
 */
function computeNextRenewal(
  startDateInput: string,
  billingCycle: string,
  opts: { customNumber: number; customUnit: "days" | "months" | "years" }
) {
  const startISO = normalizeYMD(startDateInput);
  const start = startOfDay(parseLocalYMD(startISO));
  if (Number.isNaN(start.getTime())) return "";

  const today = startOfDay(new Date());

  let stepN = 1;
  let stepUnit: "days" | "months" | "years" = "months";

  switch (billingCycle) {
    case "weekly":
      stepN = 7;
      stepUnit = "days";
      break;
    case "every_2_weeks":
      stepN = 14;
      stepUnit = "days";
      break;
    case "monthly":
      stepN = 1;
      stepUnit = "months";
      break;
    case "every_3_months":
      stepN = 3;
      stepUnit = "months";
      break;
    case "every_6_months":
      stepN = 6;
      stepUnit = "months";
      break;
    case "yearly":
      stepN = 1;
      stepUnit = "years";
      break;
    case "custom":
      stepN = Math.max(1, Math.floor(opts.customNumber));
      stepUnit = opts.customUnit;
      break;
    default:
      stepN = 1;
      stepUnit = "months";
  }

  const stepOnce = (d: Date) => {
    if (stepUnit === "days") return addDays(d, stepN);
    if (stepUnit === "months") return addMonths(d, stepN);
    return addYears(d, stepN);
  };

  // ✅ first renewal is start + interval
  let candidate = startOfDay(stepOnce(start));

  // then advance until candidate >= today
  let iterations = 0;
  while (candidate.getTime() < today.getTime() && iterations < 2000) {
    candidate = startOfDay(stepOnce(candidate));
    iterations += 1;
  }

  return toYYYYMMDD(candidate);
}

/* dedupe util */
function normalizeVendor(v: string) {
  return (v || "").trim().toLowerCase();
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
    normalizeYMD(renewal_date || ""),
  ].join("|");
}