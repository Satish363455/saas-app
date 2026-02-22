// lib/subscriptions/smartRenewal.ts
import { toLocalYMD } from "@/lib/date";

type Input = {
  renewalDate: string | null | undefined;
  billingCycle: string | null | undefined;
  cancelled?: boolean;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function smartRenewal({
  renewalDate,
  billingCycle,
  cancelled = false,
}: Input): string | null {
  if (!renewalDate || cancelled) return renewalDate ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = new Date(renewalDate);
  if (Number.isNaN(current.getTime())) return renewalDate;

  current.setHours(0, 0, 0, 0);

  if (current >= today) {
    return renewalDate; // already future
  }

  const cycle = String(billingCycle ?? "monthly").toLowerCase();

  let maxLoops = 50; // safety

  while (current < today && maxLoops > 0) {
    if (cycle === "weekly") {
      current = addDays(current, 7);
    } else if (cycle === "every_2_weeks" || cycle === "2_weeks") {
      current = addDays(current, 14);
    } else if (cycle === "every_3_months" || cycle === "3_months") {
      current = addMonths(current, 3);
    } else if (cycle === "every_6_months" || cycle === "6_months") {
      current = addMonths(current, 6);
    } else if (cycle === "yearly") {
      current = addYears(current, 1);
    } else {
      current = addMonths(current, 1); // default monthly
    }

    maxLoops--;
  }

  return toLocalYMD(current);
}