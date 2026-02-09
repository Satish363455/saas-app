// app/dashboard/SendTestEmailButton.tsx
"use client";

import React, { useState } from "react";

export default function SendTestEmailButton({
  disabled,
  mode = "test",
}: {
  disabled?: boolean;
  mode?: "test" | "";
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (disabled) return;

    setLoading(true);
    setMessage(null);

    try {
      const url = `/api/reminders/run${mode ? `?mode=${encodeURIComponent(mode)}` : ""}`;
      const res = await fetch(url, { method: "POST", cache: "no-store" });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setOk(false);
        setMessage(
          payload?.error ??
            payload?.result?.error ??
            `Request failed with status ${res.status}`
        );
      } else {
        setOk(true);
        // Build a friendly summary
        const sent = payload?.result?.sent ?? payload?.result?.sent ?? payload?.sent ?? 0;
        const skipped = payload?.result?.skippedNoEmail ?? payload?.skippedNoEmail ?? 0;
        setMessage(`Test email triggered. Sent: ${sent}. Skipped: ${skipped}.`);
      }
    } catch (err: any) {
      setOk(false);
      setMessage(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send test email"}
      </button>

      {message ? (
        <div
          className={`mt-3 text-sm px-3 py-2 rounded-md ${
            ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}