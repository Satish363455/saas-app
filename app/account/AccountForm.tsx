// app/account/AccountForm.tsx
"use client";

import { useState } from "react";

type Props = {
  email: string;
  initial: {
    full_name: string;
    avatar_url: string;
  };
};

export default function AccountForm({ email, initial }: Props) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initial.full_name);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);

  async function save() {
    setLoading(true);
    setSaved(null);

    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl }),
    });

    setLoading(false);
    setSaved(res.ok ? "Saved!" : "Save failed");
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-black/60">Update your public details.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Email (read-only)</label>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm"
            value={email}
            disabled
          />
        </div>

        <div>
          <label className="text-sm font-medium">Full name</label>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Avatar URL</label>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
          <p className="mt-2 text-xs text-black/55">Optional. You can paste an image URL.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
        {saved ? <span className="text-sm text-black/70">{saved}</span> : null}
      </div>
    </section>
  );
}