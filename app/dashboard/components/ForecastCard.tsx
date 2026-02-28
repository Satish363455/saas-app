// app/dashboard/components/ForecastCard.tsx

type Props = {
  total: number;
  currency: string;
  activeCount?: number;
  dueSoonCount?: number;
};

export default function ForecastCard({
  total,
  currency,
  activeCount = 0,
  dueSoonCount = 0,
}: Props) {
  return (
    <section className="rounded-3xl bg-emerald-500 p-6 shadow-sm text-white">
      <div className="text-xs tracking-[0.35em] opacity-90">
        30-DAY FORECAST
      </div>

      <div className="mt-5 text-center">
        <div className="text-5xl font-black tracking-tight">
          {currency} {total.toFixed(2)}
        </div>
        <div className="mt-1 text-sm opacity-90">
          expected charges
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/15 px-4 py-4 text-center">
          <div className="text-xs tracking-[0.25em] opacity-90">
            Active
          </div>
          <div className="mt-2 text-2xl font-bold">
            {activeCount}
          </div>
        </div>

        <div className="rounded-2xl bg-white/15 px-4 py-4 text-center">
          <div className="text-xs tracking-[0.25em] opacity-90">
            Due soon
          </div>
          <div className="mt-2 text-2xl font-bold">
            {dueSoonCount}
          </div>
        </div>
      </div>
    </section>
  );
}