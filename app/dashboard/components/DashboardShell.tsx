import React from "react";

type Props = {
  children: React.ReactNode;
  userEmail?: string;
};

function formatTopDate(d = new Date()) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

export default function DashboardShell({ children, userEmail }: Props) {
  return (
    <main className="min-h-screen bg-[#f6f5f1]">
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Hero */}
        <section className="rounded-[28px] border border-black/5 bg-[#f3f2ef] p-6 sm:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[640px]">
              <div className="text-[11px] tracking-[0.32em] text-black/45">
                {formatTopDate()}
              </div>

              <h1 className="mt-4 text-[44px] leading-[0.95] sm:text-[64px] font-black tracking-tight text-black">
                Your subs,
                <br />
                <span className="text-emerald-400">under control.</span>
              </h1>

              <p className="mt-4 text-sm text-black/55">
                Overview of your subscriptions and upcoming renewals.
              </p>

              {userEmail ? (
                <p className="mt-2 text-xs text-black/45">
                  Logged in as{" "}
                  <span className="font-medium text-black/70">{userEmail}</span>
                </p>
              ) : null}

              <div className="mt-6">
                <a
                  href="#add-subscription"
                  className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(16,185,129,0.25)] hover:bg-emerald-600 active:scale-[0.99] transition"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                    +
                  </span>
                  NEW SUB
                  <span className="ml-1 text-lg leading-none">→</span>
                </a>
              </div>
            </div>

            {/* Right side is intentionally empty in your screenshot (button sits right). */}
            <div className="hidden md:block" />
          </div>

          {/* Content below hero */}
          <div className="mt-8 sm:mt-10 space-y-8">{children}</div>
        </section>

        <footer className="mt-10 flex items-center justify-between text-xs tracking-[0.22em] text-black/35">
          <span>SUBWISE © {new Date().getFullYear()}</span>
          <span />
        </footer>
      </div>
    </main>
  );
}