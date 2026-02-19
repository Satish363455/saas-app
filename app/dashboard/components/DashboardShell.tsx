import React from "react";

type Props = {
  children: React.ReactNode;
  userEmail?: string;
};

export default function DashboardShell({ children, userEmail }: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white">
      <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-black/60">
              Overview of your subscriptions and upcoming renewals.
            </p>

            {userEmail ? (
              <p className="mt-1 text-xs text-black/50">
                Logged in as{" "}
                <span className="font-medium text-black/75">{userEmail}</span>
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#add-subscription"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              + Add Subscription
            </a>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}