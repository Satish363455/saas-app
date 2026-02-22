"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  avatarUrl: string | null;
  fallbackLetter?: string;
};

export default function ProfileAvatar({
  userId,
  avatarUrl,
  fallbackLetter = "S",
}: Props) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl);

  async function uploadAvatar(file: File) {
    try {
      setUploading(true);

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) throw new Error("No public URL");

      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", userId);

      setPreview(data.publicUrl);
    } catch (err) {
      alert("Failed to upload avatar");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* ✅ FIXED SIZE AVATAR */}
      <div className="h-14 w-14 overflow-hidden rounded-full border border-black/10 bg-white grid place-items-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-black/60">
            {fallbackLetter}
          </span>
        )}
      </div>

      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              uploadAvatar(e.target.files[0]);
            }
          }}
        />
        <span className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50">
          {uploading ? "Uploading..." : "Upload photo"}
        </span>
      </label>
    </div>
  );
}