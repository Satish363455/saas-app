// app/notifications/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server"; // server-only is OK here
import MerchantIcon from "@/app/components/MerchantIcon";
import { effectiveNextRenewal } from "../../lib/subscriptions/effectiveNextRenewal";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-2 text-sm text-black/60">Please login to view notifications.</p>
      </div>
    );
  }

  const { data: subs = [] } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  const today = startOfDay(new Date());

  // Build two lists:
  // 1) Recently auto-renewed = renew date was in last 7 days (based on effective logic)
  // 2) Upcoming = next renewal in next 7 days (based on effective logic)

  const upcoming: any[] = [];
  const recent: any[] = [];

  for (const s of subs as any[]) {
    const status = String(s.status ?? "active").toLowerCase();
    const isCancelled = status === "cancelled" || !!s.cancelled_at;
    if (isCancelled) continue;

    const next = effectiveNextRenewal({
      renewalDate: s.renewal_date,
      billingCycle: s.billing_cycle,
      cancelled: false,
    });

    const nextDate = new Date(next);
    if (Number.isNaN(nextDate.getTime())) continue;

    const diff = daysBetween(today, nextDate);

    // Upcoming (0..7)
    if (diff >= 0 && diff <= 7) {
      upcoming.push({ ...s, next, diff });
    }

    // Recent auto-renewed:
    // If your stored renewal_date is behind today, effectiveNextRenewal "jumps" forward.
    // We'll treat anything where the stored renewal_date was within the last 7 days as “recent”
    const stored = new Date(s.renewal_date);
    if (!Number.isNaN(stored.getTime())) {
      const ago = daysBetween(stored, today);
      if (ago >= 0 && ago <= 7) {
        recent.push({ ...s, stored: s.renewal_date, ago });
      }
    }
  }

  recent.sort((a, b) => a.ago - b.ago);
  upcoming.sort((a, b) => a.diff - b.diff);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Link href="/dashboard" className="text-sm text-black/60 hover:text-black">
          Back to Dashboard
        </Link>
      </div>

      {/* Recently Auto-renewed */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-base font-semibold">Recently auto-renewed</h2>
        <p className="mt-1 text-sm text-black/60">Last 7 days</p>

        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-black/60">No recent renewals.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <MerchantIcon name={s.merchant_name ?? s.vendor ?? "Subscription"} size={34} />
                  <div>
                    <div className="font-semibold">{s.merchant_name ?? s.vendor ?? "Subscription"}</div>
                    <div className="text-sm text-black/60">
                      Renewed {s.ago} day{s.ago === 1 ? "" : "s"} ago
                    </div>
                  </div>
                </div>
                <div className="text-sm text-black/60">
                  {String(s.currency ?? "USD")} {Number(s.amount ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-base font-semibold">Upcoming renewals</h2>
        <p className="mt-1 text-sm text-black/60">Next 7 days</p>

        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-black/60">No upcoming renewals.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <MerchantIcon name={s.merchant_name ?? s.vendor ?? "Subscription"} size={34} />
                  <div>
                    <div className="font-semibold">{s.merchant_name ?? s.vendor ?? "Subscription"}</div>
                    <div className="text-sm text-black/60">
                      Renews in {s.diff} day{s.diff === 1 ? "" : "s"} ({String(s.next).slice(0, 10)})
                    </div>
                  </div>
                </div>
                <div className="text-sm text-black/60">
                  {String(s.currency ?? "USD")} {Number(s.amount ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}