// app/settings/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("reminders_enabled, reminder_days, preferred_currency, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const initial = {
    reminders_enabled: !!profile?.reminders_enabled,
    reminder_days: (profile?.reminder_days ?? 3) as 1 | 3 | 7,
    preferred_currency: profile?.preferred_currency ?? "USD",
    timezone: profile?.timezone ?? "UTC",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto w-full max-w-[900px] px-4 py-10 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-black/60">
              Logged in as <span className="font-medium text-black/75">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white"
            >
              Back to Dashboard
            </Link>

            {/* ✅ Profile button -> goes to /account */}
            <Link
              href="/account"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white"
            >
              Profile
            </Link>
          </div>
        </div>

        <SettingsForm initial={initial} />
      </div>
    </main>
  );
}