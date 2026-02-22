// lib/subscriptions/smartRenewal.ts
import { parseLocalYMD, toISODateLocal } from "@/lib/date";

type Input = {
  renewalDate: string | null | undefined; // "YYYY-MM-DD"
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

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function addYears(date: Date, years: number) {
  const d = new Date(date);
  const m = d.getMonth();
  const day = d.getDate();
  d.setFullYear(d.getFullYear() + years);
  if (d.getMonth() !== m) d.setDate(0);
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

  // ✅ FIX: parse YYYY-MM-DD as LOCAL (no UTC shifting)
  let current = startOfDayLocal(parseLocalYMD(renewalDate));
  if (Number.isNaN(current.getTime())) return renewalDate;

  // already future
  if (current >= today) return toISODateLocal(current);

  const cycle = String(billingCycle ?? "monthly").toLowerCase();
  let maxLoops = 200; // safety

  while (current < today && maxLoops-- > 0) {
    if (cycle === "weekly") current = startOfDayLocal(addDays(current, 7));
    else if (cycle === "every_2_weeks" || cycle === "2_weeks") current = startOfDayLocal(addDays(current, 14));
    else if (cycle === "every_3_months" || cycle === "3_months") current = startOfDayLocal(addMonths(current, 3));
    else if (cycle === "every_6_months" || cycle === "6_months") current = startOfDayLocal(addMonths(current, 6));
    else if (cycle === "yearly") current = startOfDayLocal(addYears(current, 1));
    else current = startOfDayLocal(addMonths(current, 1));
  }

  return toISODateLocal(current);
}