"use client";
import { useState } from "react";

export default function DeleteAccountButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Are you sure? This will permanently delete your account and data.")) return;
    setBusy(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, confirm: true }),
    });
    const json = await res.json().catch(()=>({}));
    setBusy(false);
    if (!res.ok) return alert("Failed: " + (json?.error ?? res.status));
    // sign out and redirect to home
    alert("Account deleted");
    window.location.href = "/";
  }

  return (
    <button onClick={onDelete} className="btn-ghost text-red-600" disabled={busy}>
      {busy ? "Deleting…" : "Delete account"}
    </button>
  );
}