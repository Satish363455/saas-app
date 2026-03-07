// app/dashboard/settings/SettingsForm.tsx
"use client";

type Profile = {
  full_name: string;
  avatar_url: string;
  reminders_enabled: boolean;
  reminder_days: number;
  preferred_currency: string;
  timezone: string;
};

export default function SettingsForm({
  userEmail,
  initialProfile,
}: {
  userEmail: string;
  initialProfile: Profile;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Settings</h2>
      <p className="mt-1 text-sm text-black/60">Signed in as {userEmail}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Full name</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            defaultValue={initialProfile.full_name}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Timezone</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            defaultValue={initialProfile.timezone}
            placeholder="UTC"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Reminder days before</label>
          <input
            type="number"
            min={0}
            max={30}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            defaultValue={initialProfile.reminder_days}
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input
            id="reminders"
            type="checkbox"
            className="h-4 w-4"
            defaultChecked={initialProfile.reminders_enabled}
          />
          <label htmlFor="reminders" className="text-sm font-medium">
            Enable email reminders
          </label>
        </div>
      </div>

      <button
        type="button"
        className="mt-6 rounded-xl bg-emerald-500 px-4 py-2 text-white font-semibold"
        onClick={() => alert("UI fixed. Next: wire save to API.")}
      >
        Save
      </button>
    </section>
  );
}