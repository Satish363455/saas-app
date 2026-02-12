export type BillingCycle = "weekly" | "monthly" | "yearly";

export function computeNextRenewal(start: Date, cycle: BillingCycle) {
  const d = new Date(start);

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

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}