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
    | "weekly"
    | "every_2_weeks"
    | "monthly"
    | "every_3_months"
    | "every_6_months"
    | "yearly"
    | "custom"
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

  function resetForm() {
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
  }

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

      resetForm();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="add-subscription"
      className="rounded-[26px] border border-black/10 bg-white px-8 py-7 shadow-[0_10px_25px_rgba(0,0,0,0.04)]"
    >
      <div className="text-[11px] tracking-[0.34em] text-black/45">ADD SUBSCRIPTION</div>

      {isPotentialDuplicate ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠️ Looks like a duplicate (same merchant + amount + renewal date).
        </div>
      ) : null}

      {banner ? (
        <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/70">
          {banner}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-6">
        {/* Vendor + Plan */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Field label="VENDOR">
            <Input
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Netflix"
              required
            />
          </Field>

          <Field label="PLAN">
            <Input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Premium"
            />
          </Field>
        </div>

        {/* Amount + Currency + Cycle */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Field label="AMOUNT">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
            />
          </Field>

          <Field label="CURRENCY">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </Field>

          <Field label="CYCLE">
            <Select
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
            </Select>
          </Field>
        </div>

        {/* Custom interval */}
        {billingCycle === "custom" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="CUSTOM INTERVAL">
              <div className="flex gap-3">
                <Input
                  type="number"
                  min={1}
                  value={String(customIntervalNumber)}
                  onChange={(e) => {
                    const v = Number(e.target.value || 1);
                    setCustomIntervalNumber(v < 1 ? 1 : v);
                  }}
                />
                <Select
                  value={customIntervalUnit}
                  onChange={(e) => setCustomIntervalUnit(e.target.value as CustomUnit)}
                >
                  <option value="days">days</option>
                  <option value="months">months</option>
                  <option value="years">years</option>
                </Select>
              </div>
            </Field>
          </div>
        ) : null}

        {/* Next renewal + Notes */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Field label="NEXT RENEWAL">
            <div className="relative">
              <input
                readOnly
                value={computedNextRenewal ? formatDisplayDate(computedNextRenewal) : ""}
                placeholder="02/28/2026"
                className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-medium text-black/70 outline-none"
              />
              {/* show raw ymd on right like your screenshot */}
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black/45">
                {computedNextRenewal || ""}
              </div>
            </div>
          </Field>

          <Field label="NOTES">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>

        {/* Start date (keep, but tuck it visually) */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Field label="START DATE">
            <input
              type="date"
              className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black/80 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 items-center gap-3 rounded-2xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(16,185,129,0.25)] hover:bg-emerald-600 disabled:opacity-60"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 text-lg">
              +
            </span>
            {saving ? "Saving..." : "ADD"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="inline-flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-black/60 hover:bg-black/5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white">
              ↻
            </span>
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------------- UI bits ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.34em] text-black/45">{label}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black/80 outline-none",
        "placeholder:text-black/30",
        "focus:border-black/20",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black/80 outline-none",
        "focus:border-black/20",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

/* ---------------- Date helpers (timezone-safe) ---------------- */

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseLocalYMD(ymd: string) {
  if (!isYMD(ymd)) return new Date(ymd);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function normalizeYMD(dateStr: string) {
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

  let candidate = startOfDay(stepOnce(start));

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

/* show MM/DD/YYYY from YYYY-MM-DD for the left display */
function formatDisplayDate(ymd: string) {
  if (!isYMD(ymd)) return ymd;
  const d = parseLocalYMD(ymd);
  return d.toLocaleDateString("en-US");
}