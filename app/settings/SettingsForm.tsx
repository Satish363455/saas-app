// app/settings/SettingsForm.tsx
"use client";

import { useState } from "react";

type Props = {
  initial: {
    reminders_enabled: boolean;
    reminder_days: 1 | 3 | 7;
    preferred_currency: string;
    timezone: string;
  };
};

export default function SettingsForm({ initial }: Props) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [remindersEnabled, setRemindersEnabled] = useState(initial.reminders_enabled);
  const [reminderDays, setReminderDays] = useState<1 | 3 | 7>(initial.reminder_days);
  const [preferredCurrency, setPreferredCurrency] = useState(initial.preferred_currency);
  const [timezone, setTimezone] = useState(initial.timezone);

  async function save() {
    setLoading(true);
    setSaved(null);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reminders_enabled: remindersEnabled,
        reminder_days: reminderDays,
        preferred_currency: preferredCurrency,
        timezone,
      }),
    });

    setLoading(false);
    setSaved(res.ok ? "Saved!" : "Save failed");
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reminder Settings</h2>

        <label className="inline-flex items-center gap-2 text-sm">
          <span className="text-black/70">Enable email reminders</span>
          <button
            type="button"
            onClick={() => setRemindersEnabled((v) => !v)}
            className={`h-6 w-11 rounded-full border border-black/10 p-0.5 transition ${
              remindersEnabled ? "bg-emerald-600" : "bg-black/10"
            }`}
            aria-pressed={remindersEnabled}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                remindersEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Reminder days before renewal</label>
          <select
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={reminderDays}
            onChange={(e) => setReminderDays(Number(e.target.value) as 1 | 3 | 7)}
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Preferred currency</label>
          <select
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={preferredCurrency}
            onChange={(e) => setPreferredCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="INR">INR</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          <p className="mt-2 text-xs text-black/55">
            Used for display defaults (you can still set currency per subscription).
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium">Timezone</label>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Example: UTC, Asia/Kolkata, America/New_York"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
        {saved ? <span className="text-sm text-black/70">{saved}</span> : null}
      </div>
    </section>
  );
}