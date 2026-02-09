// app/page.tsx
import Link from "next/link";
import MerchantIcon from "@/app/components/MerchantIcon";

const demo = [
  { name: "Netflix", plan: "Premium Monthly" },
  { name: "YouTube", plan: "Premium Monthly" },
  { name: "Apple Music", plan: "Dolby Atmos" },
  { name: "Spotify", plan: "Standard Monthly" },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* HERO */}
      <section className="grid items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight">
            Stay on top of your{" "}
            <span className="text-emerald-500">subscriptions</span>
          </h1>

          <p className="max-w-xl text-lg text-zinc-600">
            Track, manage, and get reminders for upcoming renewals all in one place.
            Never forget another subscription payment.
          </p>

          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Start for Free
            </Link>

            <button className="rounded-xl border px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
              Book a Demo
            </button>
          </div>
        </div>

        {/* DASHBOARD PREVIEW */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="text-sm font-semibold text-zinc-900">
              Dashboards
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="h-2 w-2 rounded-full bg-zinc-300" />
              <span className="h-2 w-2 rounded-full bg-zinc-300" />
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {demo.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <MerchantIcon name={s.name} size={40} />
                    <div>
                      <div className="text-sm font-semibold">
                        {s.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {s.plan}
                      </div>
                    </div>
                  </div>

                  <div className="h-5 w-5 rounded-full border border-zinc-300 bg-white" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="rounded-2xl border bg-white p-10 shadow-sm">
        <h2 className="text-2xl font-bold text-zinc-900">
          How it works
        </h2>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <Link
            href="/dashboard#add-subscription"
            className="group text-center"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-xl group-hover:bg-zinc-200">
              +
            </div>
            <div className="mt-4 text-base font-semibold">
              Add Subscription
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              Track purchases at an expense your wallet tolerates.
            </div>
          </Link>

          <Link
            href="/settings"
            className="group text-center"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-xl group-hover:bg-zinc-200">
              +
            </div>
            <div className="mt-4 text-base font-semibold">
              Get Reminder
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              Never worry — get reminders and stay ahead.
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group text-center"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-xl group-hover:bg-zinc-200">
              +
            </div>
            <div className="mt-4 text-base font-semibold">
              Stay Informed
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              See renewals, amounts, and upcoming charges instantly.
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}