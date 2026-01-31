"use client";

import { useState } from "react";

export default function PortalButton() {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error ?? "Failed to open portal");
        return;
      }

      if (!data?.url) {
        alert("No portal URL returned");
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      className="border rounded-md p-2 mt-4"
    >
      {loading ? "Opening..." : "Manage Subscription"}
    </button>
  );
}