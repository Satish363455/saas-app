"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppTopNav() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    pathname === href
      ? "text-emerald-600 font-semibold"
      : "text-black/70 hover:text-black";

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-semibold tracking-tight text-lg">SubWise</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/settings" className={linkClass("/settings")}>
            Settings
          </Link>
          <Link href="/account" className={linkClass("/account")}>
            Account
          </Link>
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          <button className="h-9 w-9 rounded-full border border-black/10 bg-white hover:bg-black/5">
            🔔
          </button>
          <div className="h-9 w-9 rounded-full border border-black/10 bg-black/5" />
        </div>
      </div>
    </header>
  );
}