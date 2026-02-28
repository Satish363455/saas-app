// app/dashboard/components/CategoryCard.tsx
type Props = {
  subs: any[];
  currency: string;
};

function money(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function CategoryCard({ subs, currency }: Props) {
  // ⚠️ You don’t have a "category" column in your code.
  // So this groups by a simple heuristic (you can replace later with real category).
  const buckets = new Map<string, number>();

  for (const s of subs || []) {
    const name = String(s.merchant_name ?? "Other");
    const amt = typeof s.amount === "number" ? s.amount : Number(s.amount);
    const v = Number.isFinite(amt) ? amt : 0;

    const key =
      /netflix|prime|youtube|spotify/i.test(name) ? "Entertainment" :
      /aws|render|vercel|github/i.test(name) ? "Infrastructure" :
      /notion|figma|chatgpt|gemini/i.test(name) ? "Productivity" :
      "Other";

    buckets.set(key, (buckets.get(key) ?? 0) + v);
  }

  const rows = Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const total = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <section className="rounded-[32px] bg-white p-6 border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
      <p className="text-xs tracking-[0.25em] text-black/45 uppercase">By category</p>

      <div className="mt-6 space-y-5">
        {rows.length === 0 ? (
          <p className="text-sm text-black/50">No data yet.</p>
        ) : (
          rows.map(([label, value]) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-black">{label}</p>
                  <p className="font-semibold text-black">
                    {currency} {money(value)}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/5 overflow-hidden">
                  <div className="h-full w-[1%] rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 border-t border-black/5 pt-4 flex items-center justify-between">
        <p className="text-sm text-black/50">Total active</p>
        <p className="font-semibold text-black">
          {currency} {money(subs.reduce((s, x) => s + (Number(x.amount) || 0), 0))}
          <span className="text-black/40">/mo</span>
        </p>
      </div>
    </section>
  );
}