// app/settings/SettingsForm.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initial: {
    reminders_enabled: boolean;
    reminder_days: 1 | 3 | 7;
    preferred_currency: string;
    timezone: string;

    full_name?: string;
    phone?: string;
    bio?: string;
    avatar_url?: string | null;
    email?: string;
  };
};

export default function SettingsForm({ initial }: Props) {
  const supabase = useMemo(() => createClient(), []);

  // feedback
  const [saved, setSaved] = useState<string | null>(null);

  // ---------- profile ----------
  const [profileSaving, setProfileSaving] = useState(false);

  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initial.avatar_url ?? null
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ---------- reminders ----------
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

  // ---------- password ----------
  const [pwSaving, setPwSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // ---------- delete ----------
  const [deleting, setDeleting] = useState(false);

  const avatarSrc = avatarUrl || "";
  const letter = (fullName?.[0] || initial.email?.[0] || "S").toUpperCase();

  async function saveProfile() {
    setProfileSaving(true);
    setSaved(null);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        bio,
        avatar_url: avatarUrl,
      }),
    });

    setProfileSaving(false);

    const data = await res.json().catch(() => ({}));
    setSaved(res.ok ? "Profile saved!" : data?.error ?? "Profile save failed");
  }

  async function saveReminderSettings() {
    setSettingsSaving(true);
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

    setSettingsSaving(false);

    const data = await res.json().catch(() => ({}));
    setSaved(res.ok ? "Settings saved!" : data?.error ?? "Settings save failed");
  }

  async function onPickAvatar(file: File) {
    setUploadError(null);
    setUploading(true);
    setSaved(null);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) throw new Error("Not authenticated");

      const userId = authData.user.id;

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Could not get avatar URL");

      // update UI immediately
      setAvatarUrl(publicUrl);

      // auto-save avatar immediately
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      if (!res.ok) {
        setSaved("Photo uploaded, but profile save failed. Click Save Profile.");
      } else {
        setSaved("Photo uploaded!");
      }
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function updatePassword() {
    if (!newPassword || newPassword.length < 6) {
      setSaved("Password must be at least 6 characters.");
      return;
    }

    setPwSaving(true);
    setSaved(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPwSaving(false);

    if (error) {
      setSaved(error.message);
      return;
    }

    setNewPassword("");
    setSaved("Password updated!");
  }

  async function deleteAccount() {
    if (!confirm("Delete your account permanently? This cannot be undone."))
      return;

    setDeleting(true);
    setSaved(null);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSaved(data?.error ?? "Delete failed");
        return;
      }

      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* PROFILE */}
      <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Profile</h2>

          <button
            type="button"
            onClick={saveProfile}
            disabled={profileSaving || uploading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4">
          {/* ✅ SMALL avatar like your 2nd screenshot */}
          <div className="h-14 w-14 overflow-hidden rounded-full border border-black/10 bg-white">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-semibold text-black/50">
                {letter}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickAvatar(f);
                }}
              />
              {uploading ? "Uploading..." : "Upload photo"}
            </label>

            {uploadError ? (
              <div className="text-xs text-red-600">{uploadError}</div>
            ) : (
              <div className="text-xs text-black/50">
                JPG/PNG recommended. Storage policies must allow uploads.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Full name</label>
            <input
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Phone</label>
            <input
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 5555"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us something about you"
            />
          </div>
        </div>

        {saved ? <div className="mt-4 text-sm text-black/70">{saved}</div> : null}
      </section>

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

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={saveReminderSettings}
            disabled={settingsSaving}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
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
            className="w-fit rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
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
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete Account"}
        </button>
      </section>
    </div>
  );
}