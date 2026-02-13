// app/settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/login");

  // ensure profile exists
  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, reminders_enabled, reminder_days, preferred_currency, timezone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-black/60">Manage your reminder preferences and account details.</p>
      </div>

      <SettingsForm
        userEmail={user.email ?? ""}
        initialProfile={{
          full_name: profile?.full_name ?? "",
          avatar_url: profile?.avatar_url ?? "",
          reminders_enabled: !!profile?.reminders_enabled,
          reminder_days: profile?.reminder_days ?? 3,
          preferred_currency: profile?.preferred_currency ?? "USD",
          timezone: profile?.timezone ?? "UTC",
        }}
      />
    </main>
  );
}