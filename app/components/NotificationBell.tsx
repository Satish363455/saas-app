"use client";

import { useMemo, useState } from "react";

export type NotificationItem = {
  id: string;
  title: string;
  date?: string; // YYYY-MM-DD
  href?: string;
  isRead?: boolean; // optional for future
};

export default function NotificationBell({
  items = [],
}: {
  items?: NotificationItem[];
}) {
  const [open, setOpen] = useState(false);

  const unread = items?.length ?? 0;

  const sorted = useMemo(() => {
    return (items ?? []).slice(0, 8);
  }, [items]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white hover:bg-black/5"
        aria-label="Notifications"
      >
        <span className="text-base">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-semibold">Notifications</div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-xs text-black/60 hover:bg-black/5"
            >
              Close
            </button>
          </div>

          <div className="max-h-[360px] overflow-auto">
            {sorted.length === 0 ? (
              <div className="px-4 py-6 text-sm text-black/60">
                No notifications right now.
              </div>
            ) : (
              sorted.map((n) => (
                <a
                  key={n.id}
                  href={n.href ?? "/dashboard"}
                  className="block border-t border-black/5 px-4 py-3 hover:bg-black/5"
                >
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.date && (
                    <div className="mt-1 text-xs text-black/50">{n.date}</div>
                  )}
                </a>
              ))
            )}
          </div>

          <div className="border-t border-black/5 px-4 py-2 text-right">
            <a href="/dashboard/notifications" className="text-xs font-semibold text-emerald-700">
              View all →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}