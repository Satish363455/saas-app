// app/dashboard/components/BreakdownCard.tsx
type Props = {
  active: number;
  dueSoon: number;
  expired: number;
  cancelled: number;
};

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-black/55">{label}</span>
      <span className="font-semibold text-black">{value}</span>
    </div>
  );
}

export default function BreakdownCard({ active, dueSoon, expired, cancelled }: Props) {
  return (
    <section className="rounded-[32px] bg-white p-6 border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
      <p className="text-xs tracking-[0.25em] text-black/45 uppercase">Breakdown</p>

      <div className="mt-6 space-y-3">
        <StatRow label="Active" value={active} />
        <StatRow label="Due soon" value={dueSoon} />
        <StatRow label="Expired" value={expired} />
        <StatRow label="Cancelled" value={cancelled} />
      </div>

      {/* simple donut placeholder (optional) */}
      <div className="mt-8 flex justify-center">
        <div className="h-40 w-40 rounded-full border-[16px] border-emerald-500/70 border-t-amber-400 border-r-zinc-300" />
      </div>
    </section>
  );
}