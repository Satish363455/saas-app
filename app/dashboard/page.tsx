import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalButton from "./PortalButton";
import TrackedSubscriptionsSection from "./TrackedSubscriptionsSection";
import type { TrackedSub } from "./types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Your SaaS subscription (Stripe subscription you sell)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, price_id, current_period_end")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Tracked subscriptions (Netflix/Amazon/Adobe etc.)
  const { data: tracked } = await supabase
    .from("tracked_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: true });

  const trackedSubs = (tracked ?? []) as TrackedSub[];

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2">Logged in as: {user.email}</p>

      {/* Your SaaS Subscription */}
      <section className="mt-6 border rounded-md p-4 max-w-2xl">
        <h2 className="text-xl font-semibold">Your SaaS Subscription</h2>

        {sub ? (
          <div className="mt-3">
            <div>Status: {sub.status}</div>
            <div>Price: {sub.price_id}</div>
            <div>
              Renews/Ends:{" "}
              {sub.current_period_end
                ? new Date(sub.current_period_end).toLocaleString()
                : "—"}
            </div>

            <div className="mt-3">
              <PortalButton />
            </div>
          </div>
        ) : (
          <div className="mt-3 opacity-80">No subscription found yet.</div>
        )}
      </section>

      {/* ✅ Tracked subscriptions section (List + Form + Duplicate warning) */}
      <TrackedSubscriptionsSection initialSubs={trackedSubs} />

      <form action="/auth/signout" method="post" className="mt-6">
        <button className="border rounded-md p-2">Sign out</button>
      </form>
    </main>
  );
}