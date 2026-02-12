// app/dashboard/SendTestEmailButton.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";

export default function SendTestEmailButton({
  disabled,
  mode = "test",
}: {
  disabled?: boolean;
  mode?: "test" | "";
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (disabled || loading) return;

    setLoading(true);

    // Optional loading toast (feels very professional)
    const toastId = toast.loading("Sending test email…");

    try {
      const url = `/api/reminders/run${
        mode ? `?mode=${encodeURIComponent(mode)}` : ""
      }`;

      const res = await fetch(url, {
        method: "POST",
        cache: "no-store",
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error("Failed to send test email", {
          id: toastId,
          description:
            payload?.error ??
            payload?.result?.error ??
            `Request failed with status ${res.status}`,
        });
        return;
      }

      // Build a friendly summary
      const sent =
        payload?.result?.sent ??
        payload?.sent ??
        0;

      const skipped =
        payload?.result?.skippedNoEmail ??
        payload?.skippedNoEmail ??
        0;

      toast.success("Test email sent", {
        id: toastId,
        description: `Sent: ${sent}. Skipped: ${skipped}.`,
      });
    } catch (err: any) {
      toast.error("Unexpected error", {
        id: toastId,
        description: err?.message ?? String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
    >
      {loading ? "Sending…" : "Send test email"}
    </button>
  );
}