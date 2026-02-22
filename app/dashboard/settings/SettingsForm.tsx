"use client";

import { useState } from "react";
import Link from "next/link";

type ProfileState = {
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
  initialProfile: ProfileState;
}) {
  const [tab, setTab] = useState<
    "Notifications" | "Appearance" | "Reminder Settings" | "Account"
  >("Notifications");

  const [p, setP] = useState<ProfileState>({
    full_name: initialProfile?.full_name ?? "",
    avatar_url: initialProfile?.avatar_url ?? "",
    reminders_enabled: initialProfile?.reminders_enabled ?? true,
    reminder_days: initialProfile?.reminder_days ?? 3,
    preferred_currency: initialProfile?.preferred_currency ?? "USD",
    timezone: initialProfile?.timezone ?? "UTC",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveSettings() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reminders_enabled: p.reminders_enabled,
          reminder_days: p.reminder_days,
          preferred_currency: p.preferred_currency,
          timezone: p.timezone,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      setMsg("Settings saved");
    } catch (err) {
      setMsg("Error saving settings");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  }

  async function saveAccount() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        }),
      });

      if (!res.ok) throw new Error("Failed to save account");

      setMsg("Account updated");
    } catch (err) {
      setMsg("Error saving account");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-black/60">
          Logged in as <span className="font-medium text-black">{userEmail}</span>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl bg-black/5 p-2">
        {["Notifications", "Appearance", "Reminder Settings", "Account"].map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                tab === t
                  ? "bg-white shadow-sm"
                  : "text-black/60 hover:bg-white/60"
              }`}
              type="button"
            >
              {t}
            </button>
          )
        )}
      </div>

      {msg && <div className="text-sm text-emerald-700">{msg}</div>}

      {/* ===================== NOTIFICATIONS ===================== */}
      {tab === "Notifications" && (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Email Notifications</h2>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Email reminders</div>
              <div className="text-sm text-black/55">
                Get notified before subscription renewals
              </div>
            </div>

            <button
              onClick={() =>
                setP({ ...p, reminders_enabled: !p.reminders_enabled })
              }
              className={`h-6 w-11 rounded-full ${
                p.reminders_enabled ? "bg-emerald-600" : "bg-black/20"
              }`}
              type="button"
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                  p.reminders_enabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save Settings
          </button>
        </section>
      )}

      {/* ===================== APPEARANCE ===================== */}
      {tab === "Appearance" && (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Display & Formatting</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">
                Preferred currency
              </label>
              <select
                value={p.preferred_currency}
                onChange={(e) =>
                  setP({ ...p, preferred_currency: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              >
                {["USD", "EUR", "INR", "GBP"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Timezone</label>
              <input
                value={p.timezone}
                onChange={(e) => setP({ ...p, timezone: e.target.value })}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save Settings
          </button>
        </section>
      )}

      {/* ===================== REMINDER SETTINGS ===================== */}
      {tab === "Reminder Settings" && (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Reminder Window</h2>

          <div className="mt-4">
            <label className="text-sm font-semibold">
              Reminder days before renewal
            </label>

            <select
              value={p.reminder_days}
              onChange={(e) =>
                setP({ ...p, reminder_days: Number(e.target.value) })
              }
              className="mt-2 w-48 rounded-xl border border-black/10 px-3 py-2 text-sm"
            >
              {[1, 3, 5, 7].map((n) => (
                <option key={n} value={n}>
                  {n} day{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save Settings
          </button>
        </section>
      )}

      {/* ===================== ACCOUNT ===================== */}
      {/* We show account inline (no navigation) so user stays on settings page */}
      {tab === "Account" && (
        <section
          id="account-section"
          className="rounded-2xl border border-black/10 bg-white p-6"
        >
          <h2 className="text-lg font-semibold">Account Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Full name</label>
              <input
                value={p.full_name}
                onChange={(e) => setP({ ...p, full_name: e.target.value })}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Avatar URL</label>
              <input
                value={p.avatar_url}
                onChange={(e) => setP({ ...p, avatar_url: e.target.value })}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={saveAccount}
            disabled={saving}
            className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save Account
          </button>
        </section>
      )}
    </div>
  );
}