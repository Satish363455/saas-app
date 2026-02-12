// app/account/AccountForm.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  initial: {
    full_name: string;
    avatar_url: string | null;
    phone: string;
    bio: string;
  };
};

export default function AccountForm({ email, initial }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const letter = (fullName?.[0] || email?.[0] || "S").toUpperCase();

  async function saveProfile() {
    setSaving(true);
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

    setSaving(false);
    setSaved(res.ok ? "Saved!" : "Save failed");
  }

  async function onPickAvatar(file: File) {
    setUploadError(null);
    setUploading(true);
    setSaved(null);

    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Could not get avatar URL");

      // update UI immediately
      setAvatarUrl(publicUrl);

      // persist immediately
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      setSaved(res.ok ? "Photo uploaded!" : "Photo uploaded, but save failed");
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Profile</div>
          <div className="text-xs text-black/55">Update your public details.</div>
        </div>

        <button
          type="button"
          onClick={saveProfile}
          disabled={saving || uploading}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {/* Avatar */}
      <div className="mt-5 flex items-center gap-4">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-black/10 bg-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-semibold text-black/60">
              {letter}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">
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
            {uploading ? "Uploading..." : "Change photo"}
          </label>

          {uploadError ? (
            <div className="text-xs text-red-600">{uploadError}</div>
          ) : (
            <div className="text-xs text-black/50">JPG/PNG recommended.</div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="mt-6 grid gap-4">
        <div>
          <label className="text-sm font-medium">Email (read-only)</label>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-sm"
            value={email}
            readOnly
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
          <label className="text-sm font-medium">Phone</label>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 555 5555"
          />
        </div>

        <div>
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
  );
}