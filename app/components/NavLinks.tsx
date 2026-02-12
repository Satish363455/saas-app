// app/components/NavLinks.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean) {
  return active
    ? "font-semibold text-zinc-900"
    : "font-medium text-zinc-700 hover:text-zinc-900";
}

export default function NavLinks() {
  const pathname = usePathname();

  const isDashboard =
    pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
  const isSettings =
    pathname === "/settings" || pathname?.startsWith("/settings/");
  const isAccount =
    pathname === "/account" || pathname?.startsWith("/account/");

  return (
    <>
      <Link
        href="/dashboard"
        className={navClass(isDashboard)}
        aria-current={isDashboard ? "page" : undefined}
      >
        Dashboard
      </Link>

      <Link
        href="/settings"
        className={navClass(isSettings)}
        aria-current={isSettings ? "page" : undefined}
      >
        Settings
      </Link>

      {/* Optional: if you want Account visible in top nav too */}
      {/* <Link
        href="/account"
        className={navClass(isAccount)}
        aria-current={isAccount ? "page" : undefined}
      >
        Account
      </Link> */}
    </>
  );
}