// app/dashboard/components/ForecastCard.tsx

type Props = {
  total: number;
  currency: string;
};

export default function ForecastCard({ total, currency }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Payment Forecast
      </h2>

      <div className="mt-6 rounded-2xl bg-emerald-50 p-6 text-center">
        <p className="text-sm text-zinc-600">
          Expected in Next 30 Days
        </p>
        <p className="mt-2 text-4xl font-bold text-emerald-600">
          {currency} {total.toFixed(2)}
        </p>
      </div>
    </section>
  );
}