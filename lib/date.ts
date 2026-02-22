export type BillingCycle = "weekly" | "monthly" | "yearly";

/** Parse YYYY-MM-DD as a LOCAL date (no UTC shift) */
export function parseLocalYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Convert Date -> YYYY-MM-DD using LOCAL calendar (no UTC shift) */
export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Next renewal is ALWAYS start + interval (not "start itself")
 * Example: if start = Feb 21 and weekly => next = Feb 28
 */
export function computeNextRenewal(start: Date, cycle: BillingCycle) {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);

  if (cycle === "weekly") {
    d.setDate(d.getDate() + 7);
    return d;
  }

  if (cycle === "monthly") {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);

    // handle months with fewer days (e.g., Jan 31 -> Feb)
    if (d.getDate() !== day) d.setDate(0);
    return d;
  }

  // yearly
  const month = d.getMonth();
  const day = d.getDate();
  d.setFullYear(d.getFullYear() + 1);

  // handle Feb 29 etc
  if (d.getMonth() !== month) d.setDate(0);
  if (d.getDate() !== day) d.setDate(0);

  return d;
}

/** Format YYYY-MM-DD safely (no timezone shift) */
export function fmtYMD(ymd: string) {
  if (!ymd) return "";
  const d = parseLocalYMD(ymd);
  return d.toLocaleDateString();
}