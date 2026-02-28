type Props = {
  total: number;
  monthly: number;
  yearly: number;
  nextRenewal: string;        // e.g., "Jan 27"
  nextRenewalMeta?: string;   // e.g., "334d"
  currency: string;
};

function splitMoney(value: number) {
  const fixed = Number(value || 0).toFixed(2); // "41.96"
  const [a, b] = fixed.split(".");
  return { a, b };
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white px-7 py-6 shadow-[0_10px_25px_rgba(0,0,0,0.04)]">
      <div className="text-[11px] tracking-[0.34em] text-black/40">
        {label.toUpperCase()}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function KpiGrid({
  total,
  monthly,
  yearly,
  nextRenewal,
  nextRenewalMeta,
  currency,
}: Props) {
  const m = splitMoney(monthly);
  const y = splitMoney(yearly);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card label="Tracked">
        <div className="flex items-end gap-2">
          <div className="text-5xl font-black tracking-tight text-black">
            {total}
          </div>
          <div className="pb-2 text-lg font-semibold text-black/45">subs</div>
        </div>
      </Card>

      <Card label="Monthly">
        <div className="flex items-end gap-2">
          <div className="text-5xl font-black tracking-tight text-black">
            {currency} {m.a}
            <span className="align-top text-2xl font-black text-black/70">
              .{m.b}
            </span>
          </div>
        </div>
      </Card>

      <Card label="Annual cost">
        <div className="flex items-end gap-2">
          <div className="text-5xl font-black tracking-tight text-black">
            {currency} {y.a}
            <span className="align-top text-2xl font-black text-black/70">
              .{y.b}
            </span>
          </div>
        </div>
      </Card>

      <Card label="Next due">
        <div className="flex items-end gap-3">
          <div className="text-5xl font-black tracking-tight text-black">
            {nextRenewal}
          </div>
          {nextRenewalMeta ? (
            <div className="pb-2 text-lg font-semibold text-black/45">
              {nextRenewalMeta}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}