import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-4xl font-semibold tracking-tight">
          Stay on top of your subscriptions
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Track, manage, and get reminders for upcoming renewals — all in one place.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-emerald-400"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/settings"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Settings
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Add subscriptions", "Track Netflix, YouTube, Spotify, etc."],
          ["Get reminders", "Email alerts before renewals."],
          ["Stay informed", "See upcoming renewals in one view."],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="text-lg font-semibold">{title}</div>
            <div className="mt-2 text-sm text-zinc-300">{desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}