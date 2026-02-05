// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppTopNav from "./components/AppTopNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
    <html lang="en" className={inter.variable}>
      <body>
        {/* Background layer */}
        <div className="app-bg" aria-hidden="true" />
        
        {/* Top navigation */}
        <AppTopNav />

        {/* Page content */}
        <main className="mx-auto max-w-[1100px] px-4 py-8">{children}</main>
      </body>
    </html>
  );
}