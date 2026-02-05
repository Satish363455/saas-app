// app/settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  await supabase.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("reminders_enabled, reminder_days, preferred_currency, timezone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-black/60">Manage your reminder preferences.</p>

      <div className="mt-6 max-w-2xl">
        <SettingsForm
          initial={{
            reminders_enabled: profile?.reminders_enabled ?? true,
            reminder_days: (profile?.reminder_days ?? 3) as 1 | 3 | 7,
            preferred_currency: profile?.preferred_currency ?? "USD",
            timezone: profile?.timezone ?? "UTC",
          }}
        />
      </div>
    </main>
  );
}