// app/components/AppTopNav.tsx
import Link from "next/link";
import RenewalBell from "./RenewalBell";
import UserNav from "./UserNav";
import type { User } from "@supabase/supabase-js";

type Props = {
  user: User | null;
};

export default function AppTopNav({ user }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <span className="text-lg font-bold">S</span>
          </div>
          <span className="text-lg font-semibold">SubWise</span>
        </Link>

        <nav className="flex items-center gap-6 text-[15px] font-semibold">
          <Link href="/dashboard" className="text-zinc-800 hover:text-zinc-950">
            Dashboard
          </Link>

          <Link href="/dashboard/settings" className="text-zinc-800 hover:text-zinc-950">
            Settings
          </Link>

          <RenewalBell />

          {/* UserNav is server component, doesn't need props */}
          <UserNav />
        </nav>
      </div>
    </header>
  );
}