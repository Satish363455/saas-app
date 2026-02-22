// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import AppTopNav from "@/components/AppTopNav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "SubWise",
  description: "Track subscriptions and get renewal reminders.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="min-h-screen text-zinc-900">
        {/* Top Navigation */}
        <AppTopNav user={user} />

        {/* Page Content */}
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>

        <Toaster richColors />
      </body>
    </html>
  );
}