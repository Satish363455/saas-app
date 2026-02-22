"use client";
import { useState } from "react";

export default function TriggerRemindersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/reminders/run", { method: "POST" });
      const json = await res.json();
      setResult(json);
      // show brief success toast / alert
      if (res.ok) {
        alert("Triggered reminders — check the result in the UI or logs.");
      } else {
        alert("Trigger failed: " + (json?.error ?? res.status));
      }
    } catch (err: any) {
      alert("Network / runtime error: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5"
      >
        {loading ? "Sending..." : "Send test email"}
      </button>

      {result && (
        <pre style={{ marginTop: 8, maxHeight: 220, overflow: "auto", background: "#f4f4f4", padding: 8 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}