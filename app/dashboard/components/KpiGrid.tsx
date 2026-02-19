// app/dashboard/components/KpiGrid.tsx

type Props = {
  total: number;
  monthly: number;
  yearly: number;
  nextRenewal: string;
  currency: string;
};

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default function KpiGrid({
  total,
  monthly,
  yearly,
  nextRenewal,
  currency,
}: Props) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Total Subscriptions" value={total} />
      <KpiCard label="Monthly Spend" value={`${currency} ${monthly.toFixed(2)}`} />
      <KpiCard label="Yearly Spend" value={`${currency} ${yearly.toFixed(2)}`} />
      <KpiCard label="Next Renewal" value={nextRenewal} />
    </div>
  );
}