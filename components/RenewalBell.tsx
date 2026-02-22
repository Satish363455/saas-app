// app/components/RenewalBell.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function RenewalBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/renewal-count")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="relative">
      <Link href="/dashboard/notifications" className="text-xl">
        🔔
      </Link>

      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {count}
        </span>
      )}
    </div>
  );
}