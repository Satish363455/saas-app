"use client";

import React, { useMemo } from "react";
import type { TrackedSub } from "./types";

function Row({
  dotClass,
  title,
  value,
}: {
  dotClass: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <span className="text-sm font-semibold text-black">{title}</span>
      </div>
      <span className="text-sm text-black/70">{value}</span>
    </div>
  );
}

export default function NotificationsPanel({ subs }: { subs: TrackedSub[] }) {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());

    let renewSoon = 0;
    let expired = 0;
    let cancelled = 0;

    for (const s of subs as any[]) {
      const status = String(s.status ?? "active").toLowerCase();
      const isCancelled = status === "cancelled" || !!s.cancelled_at;
      if (isCancelled) {
        cancelled += 1;
        continue;
      }

      const d = toDateSafe(s.renewal_date);
      if (!d) continue;

      const diff = diffDays(today, startOfDay(d));
      if (diff < 0) expired += 1;
      else if (diff <= 7) renewSoon += 1;
    }

    return { renewSoon, expired, cancelled };
  }, [subs]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black">Notifications</h2>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
          Live
        </span>
      </div>

      <div className="space-y-2">
        <Row
          dotClass="bg-amber-500"
          title="Renews soon"
          value={`${stats.renewSoon} in next 7 days`}
        />
        <Row dotClass="bg-red-600" title="Expired" value={`${stats.expired}`} />
        <Row dotClass="bg-zinc-400" title="Cancelled" value={`${stats.cancelled}`} />
      </div>

      <p className="mt-3 text-xs text-black/45">
        These are computed from your tracked subscriptions (no extra backend needed).
      </p>
    </section>
  );
}

function toDateSafe(v: any) {
  const d = new Date(String(v ?? ""));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function diffDays(a: Date, b: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}