// app/dashboard/components/UpcomingRenewalsCard.tsx

import MerchantIcon from "@/app/components/MerchantIcon";

type Props = {
  items: any[];
  currency: string;
};

export default function UpcomingRenewalsCard({ items, currency }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Upcoming Renewals
        </h2>
        <span className="text-sm text-zinc-500">Next 7 Days</span>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-zinc-500">
            No renewals in the next 7 days.
          </p>
        )}

        {items.map((sub: any) => (
          <div
            key={sub.id}
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-4"
          >
            <div className="flex items-center gap-3">
              <MerchantIcon name={sub.merchant_name} size={36} />
              <div>
                <p className="font-medium text-zinc-900">
                  {sub.merchant_name}
                </p>
                <p className="text-xs text-zinc-500">
                  {sub.effective_renewal_date?.toLocaleDateString("en-US")}
                </p>
              </div>
            </div>

            <p className="font-semibold text-zinc-900">
              {currency} {Number(sub.amount).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}