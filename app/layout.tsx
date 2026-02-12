// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import AppTopNav from "@/app/components/AppTopNav";

export const metadata: Metadata = {
  title: "SubWise",
  description: "Track subscriptions and get renewal reminders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">
        {/* Top Navigation */}
        <AppTopNav />

        {/* Page Content */}
        <main className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>

        {/* Toast notifications */}
        <Toaster richColors />
      </body>
    </html>
  );
}