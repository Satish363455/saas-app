// app/components/AppTopNav.tsx
import Link from "next/link";
import UserNav from "./UserNav";

export default function AppTopNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <span className="text-lg font-bold">S</span>
          </div>
          <span className="text-lg font-semibold">SubWise</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-zinc-700 hover:text-zinc-900">
            Dashboard
          </Link>
          <Link href="/settings" className="text-zinc-700 hover:text-zinc-900">
            Settings
          </Link>

          {/* ✅ Small circle avatar */}
          <UserNav />
        </nav>
      </div>
    </header>
  );
}