"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AvatarUploader({ userId, initialUrl }: { userId: string; initialUrl?: string | null; }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const { data, error: uploadErr } = await supabaseBrowser.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadErr) throw uploadErr;

      // create public URL
      const { publicURL, error: urlErr } = supabaseBrowser.storage
        .from("avatars")
        .getPublicUrl(fileName);

      if (urlErr) throw urlErr;
      if (!publicURL) throw new Error("No public URL");

      // save to profiles table
      const { error: updateErr } = await supabaseBrowser
        .from("profiles")
        .update({ avatar_url: publicURL })
        .eq("id", userId);

      if (updateErr) throw updateErr;

      setUrl(publicURL);
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded overflow-hidden bg-zinc-100">
        {url ? <img src={url} alt="avatar" className="w-full h-full object-cover" /> : <div className="p-3 text-center">No</div>}
      </div>
      <label className="rounded px-3 py-2 border bg-white cursor-pointer">
        {uploading ? "Uploading…" : "Change avatar"}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </div>
  );
}