import React from "react";

type Props = {
  children: React.ReactNode;
  userEmail?: string;
  dateLabel?: string; // ✅ add this
};

export default function DashboardShell({ children, userEmail, dateLabel }: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white">
      <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {/* ✅ DATE LABEL (like screenshot) */}
            {dateLabel ? (
              <p className="text-[11px] tracking-[0.35em] text-black/40 uppercase">
                {dateLabel}
              </p>
            ) : null}

            <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-tight leading-[0.95]">
              Your subs,{" "}
              <span className="block text-emerald-500">under control.</span>
            </h1>

            <p className="mt-3 text-sm text-black/60">
              Overview of your subscriptions and upcoming renewals.
            </p>

            {userEmail ? (
              <p className="mt-1 text-xs text-black/50">
                Logged in as{" "}
                <span className="font-medium text-black/75">{userEmail}</span>
              </p>
            ) : null}

            {/* ✅ button goes under hero text (matches your ref design more) */}
            <div className="mt-5">
              <a
                href="#add-subscription"
                className="inline-flex items-center gap-3 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg">
                  +
                </span>
                NEW SUB
                <span aria-hidden className="text-lg">
                  →
                </span>
              </a>
            </div>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}