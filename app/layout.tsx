// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import { Toaster } from "sonner";
import UserNav from "@/app/components/UserNav";

export const metadata = {
  title: "SubWise",
  description: "Track, manage, and get reminders for upcoming renewals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">
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

              {/* ✅ small circle avatar only */}
              <UserNav />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <Toaster richColors />
      </body>
    </html>
  );
}