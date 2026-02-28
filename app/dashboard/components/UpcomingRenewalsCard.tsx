import MerchantIcon from "@/components/MerchantIcon";

type Props = {
  items: any[];
  currency: string;
};

export default function UpcomingRenewalsCard({ items, currency }: Props) {
  return (
    <section className="rounded-[26px] border border-black/10 bg-white px-8 py-7 shadow-[0_10px_25px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-[0.34em] text-black/45">
          UPCOMING RENEWALS
        </div>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-700">
          7 DAYS
        </span>
      </div>

      {items.length === 0 ? (
        <div className="grid min-h-[160px] place-items-center py-8">
          <div className="text-center">
            <div className="text-3xl">🎉</div>
            <div className="mt-3 text-base font-medium text-black/55">
              Nothing due this week
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((sub: any) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#fbfbfa] px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-black/5 bg-white p-1">
                  <MerchantIcon name={sub.merchant_name} size={34} />
                </div>
                <div>
                  <div className="font-semibold text-black">
                    {sub.merchant_name}
                  </div>
                  <div className="text-xs text-black/45">
                    {sub.effective_renewal_date?.toLocaleDateString("en-US")}
                  </div>
                </div>
              </div>

              <div className="text-sm font-semibold text-black/80">
                {currency} {Number(sub.amount || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}