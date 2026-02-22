// lib/subscriptions/smartRenewal.ts
import { parseLocalYMD, toLocalYMD } from "@/lib/date";

type Input = {
  renewalDate: string | null | undefined; // expects YYYY-MM-DD
  billingCycle: string | null | undefined;
  cancelled?: boolean;
};

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ✅ Handles month overflow (Jan 31 + 1 month -> Feb 28/29)
function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // If month rolled and day got clamped, fix to last day of previous month
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}

// ✅ Handles leap year issues (Feb 29 + 1 year)
function addYearsSafe(date: Date, years: number) {
  const d = new Date(date);
  const month = d.getMonth();
  const day = d.getDate();

  d.setFullYear(d.getFullYear() + years);

  // If month changed (Feb 29 -> Mar), clamp to last day of previous month
  if (d.getMonth() !== month) d.setDate(0);
  if (d.getDate() !== day) d.setDate(0);

  return d;
}

export function smartRenewal({
  renewalDate,
  billingCycle,
  cancelled = false,
}: Input): string | null {
  if (!renewalDate || cancelled) return renewalDate ?? null;

  const today = startOfDayLocal(new Date());

  // ✅ IMPORTANT: parse YYYY-MM-DD as LOCAL date (prevents UTC shifting)
  let current = startOfDayLocal(parseLocalYMD(renewalDate));
  if (Number.isNaN(current.getTime())) return renewalDate;

  // ✅ If already today/future, still normalize output (prevents 1-day shift)
  if (current.getTime() >= today.getTime()) {
    return toLocalYMD(current);
  }

  const cycle = String(billingCycle ?? "monthly").toLowerCase();

  let maxLoops = 2000; // safety

  while (current.getTime() < today.getTime() && maxLoops-- > 0) {
    if (cycle === "weekly") {
      current = startOfDayLocal(addDays(current, 7));
    } else if (cycle === "every_2_weeks" || cycle === "2_weeks") {
      current = startOfDayLocal(addDays(current, 14));
    } else if (cycle === "every_3_months" || cycle === "3_months") {
      current = startOfDayLocal(addMonthsSafe(current, 3));
    } else if (cycle === "every_6_months" || cycle === "6_months") {
      current = startOfDayLocal(addMonthsSafe(current, 6));
    } else if (cycle === "yearly") {
      current = startOfDayLocal(addYearsSafe(current, 1));
    } else {
      current = startOfDayLocal(addMonthsSafe(current, 1)); // default monthly
    }
  }

  return toLocalYMD(current);
}