// app/settings/SettingsForm.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Props = {
  initial: {
    reminders_enabled: boolean;
    reminder_days: 1 | 3 | 7;
    preferred_currency: string;
    timezone: string;
  };
};

export default function SettingsForm({ initial }: Props) {
  const supabase = useMemo(() => createClient(), []);

  // reminder fields
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(
    initial.reminders_enabled
  );
  const [reminderDays, setReminderDays] = useState<1 | 3 | 7>(
    initial.reminder_days
  );
  const [preferredCurrency, setPreferredCurrency] = useState(
    initial.preferred_currency
  );
  const [timezone, setTimezone] = useState(initial.timezone);

  // password
  const [pwSaving, setPwSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // delete
  const [deleting, setDeleting] = useState(false);

  async function saveReminderSettings() {
    setSettingsSaving(true);

    try {
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Failed to save settings", {
          description: data?.error ?? "Please try again.",
        });
        return;
      }

      toast.success("Settings saved");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function updatePassword() {
    const pwd = newPassword.trim();

    if (pwd.length < 6) {
      toast.error("Password too short", {
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setPwSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });

      if (error) {
        toast.error("Failed to update password", {
          description: error.message,
        });
        return;
      }

      setNewPassword("");
      toast.success("Password updated");
    } finally {
      setPwSaving(false);
    }
  }

  async function deleteAccount() {
    const ok = confirm(
      "Delete your account permanently?\n\nThis will remove your profile and subscriptions. This cannot be undone."
    );
    if (!ok) return;

    setDeleting(true);

    try {
      // you said you already created: /app/api/account/delete/route.ts
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Delete failed", {
          description: data?.error ?? "Please try again.",
        });
        return;
      }

      toast.success("Account deleted");
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* REMINDER SETTINGS */}
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
            <label className="text-sm font-medium">
              Reminder days before renewal
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              value={reminderDays}
              onChange={(e) =>
                setReminderDays(Number(e.target.value) as 1 | 3 | 7)
              }
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
              Used for display defaults (you can still set currency per
              subscription).
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

        <div className="mt-6">
          <button
            type="button"
            onClick={saveReminderSettings}
            disabled={settingsSaving}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 md:w-auto"
          >
            {settingsSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </section>

      {/* CHANGE PASSWORD */}
      <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold">Change Password</h2>

        <div className="mt-4 grid gap-3">
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={updatePassword}
            disabled={pwSaving}
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60 md:w-fit"
          >
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </section>

      {/* DELETE ACCOUNT */}
      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-700">Delete Account</h2>
        <p className="mt-2 text-sm text-red-700/80">
          This action is permanent and cannot be undone.
        </p>

        <button
          type="button"
          onClick={deleteAccount}
          disabled={deleting}
          className="mt-4 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 md:w-fit"
        >
          {deleting ? "Deleting..." : "Delete Account"}
        </button>
      </section>
    </div>
  );
}