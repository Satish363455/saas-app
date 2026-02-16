// lib/subscriptions/effectiveNextRenewal.ts

export type EffectiveNextRenewalInput = {
  renewalDate: string | null | undefined;
  billingCycle: string | null | undefined;
  cancelled?: boolean;
  maxAdvanceCycles?: number;
};

/**
 * Returns the next renewal date (YYYY-MM-DD) that is >= today.
 * If the given renewalDate is in the past, it advances by billingCycle until it reaches today/future.
 * If cancelled = true, it returns the original renewalDate (we don't advance cancelled subs).
 */
export function effectiveNextRenewal({
  renewalDate,
  billingCycle,
  cancelled = false,
  maxAdvanceCycles = 60,
}: EffectiveNextRenewalInput): string | null {
  if (!renewalDate) return null;

  const parsed = safeParseDate(renewalDate);
  if (!parsed) return null;

  // If cancelled, we do not "auto-advance" it
  if (cancelled) return toYMD(parsed);

  const cycle = (billingCycle || "").toLowerCase().trim();

  // If cycle is missing/unknown, just return what we have
  if (!cycle) return toYMD(parsed);

  const today = startOfDay(new Date());
  let current = startOfDay(parsed);

  let guard = 0;
  while (current < today && guard < maxAdvanceCycles) {
    current = addCycle(current, cycle);
    guard++;
  }

  return toYMD(current);
}

/* ---------------- helpers ---------------- */

function safeParseDate(value: string): Date | null {
  // supports "YYYY-MM-DD" or ISO strings
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addCycle(d: Date, cycle: string) {
  const x = new Date(d);
  if (cycle.includes("week")) x.setDate(x.getDate() + 7);
  else if (cycle.includes("year") || cycle.includes("ann")) x.setFullYear(x.getFullYear() + 1);
  else x.setMonth(x.getMonth() + 1); // default monthly
  x.setHours(0, 0, 0, 0);
  return x;
}