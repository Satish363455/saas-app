// lib/date.ts

export function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Parse YYYY-MM-DD as LOCAL date (no UTC shifting)
export function parseLocalYMD(ymd: string) {
  if (!isYMD(ymd)) return new Date(ymd);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Format a Date as YYYY-MM-DD in LOCAL time (no UTC shifting)
export function toISODateLocal(d: Date) {
  const x = startOfDayLocal(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}