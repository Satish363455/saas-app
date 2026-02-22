// app/settings/AvatarUploader.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export default function AvatarUploader({
  userId,
  initialUrl,
  onUploaded,
}: {
  userId: string;
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const supabase = useBrowserSupabase();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // upload file (bucket: "avatars")
      const uploadRes = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadRes.error) {
        console.error("Upload error:", uploadRes.error);
        alert(`Upload failed: ${uploadRes.error.message ?? uploadRes.error}`);
        setUploading(false);
        return;
      }

      // get public URL — v2 returns { data: { publicUrl } }
      const urlRes = await supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = (urlRes as any)?.data?.publicUrl ?? null;

      if (!publicUrl) {
        console.error("Public URL missing in response", urlRes);
        alert("Failed to get public URL for avatar.");
        setUploading(false);
        return;
      }

      setPreview(publicUrl);
      if (onUploaded) onUploaded(publicUrl);
    } catch (err) {
      console.error("Unexpected error uploading avatar", err);
      alert("Unexpected error uploading file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="avatar"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-gray-100 grid place-items-center">
            <span className="text-lg font-semibold text-gray-500">A</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Upload avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="text-sm"
          />
          <div className="mt-1 text-xs text-gray-600">
            {uploading ? "Uploading..." : "Square image recommended. Max size depends on storage rules."}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helper: create browser supabase client ----------------
 Uses NEXT_PUBLIC_* env vars so this file works regardless of your local helper.
----------------------------------------------------------------------- */
function useBrowserSupabase(): SupabaseClient {
  // memoize client
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!url || !key) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment."
      );
    }

    return createClient(url, key, {
      auth: { persistSession: false },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
