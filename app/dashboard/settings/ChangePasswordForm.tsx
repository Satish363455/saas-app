"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ChangePasswordForm() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw) return alert("Enter password");
    setBusy(true);
    const { error } = await supabaseBrowser.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) alert("Failed to update password: " + error.message);
    else { alert("Password updated"); setPw(""); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="New password" className="input" />
      <button disabled={busy} className="btn">{busy ? "Updating…" : "Change password"}</button>
    </form>
  );
}