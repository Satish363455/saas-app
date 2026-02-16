"use client";

import React from "react";

type Props = {
  active: number;
  renewSoon: number;
  expired: number;
  cancelled: number;
};

const COLORS = {
  active: "#34D399",     // green
  renewSoon: "#F59E0B",  // amber
  expired: "#EF4444",    // red
  cancelled: "#9CA3AF",  // gray
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  // fixed precision -> stable SVG paths
  const sx = start.x.toFixed(3), sy = start.y.toFixed(3);
  const ex = end.x.toFixed(3), ey = end.y.toFixed(3);

  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`;
}

export default function StatusDonutChart({ active, renewSoon, expired, cancelled }: Props) {
  const items = [
    { key: "active", label: "Active", value: active, color: COLORS.active },
    { key: "renewSoon", label: "Renews soon", value: renewSoon, color: COLORS.renewSoon },
    { key: "expired", label: "Expired", value: expired, color: COLORS.expired },
    { key: "cancelled", label: "Cancelled", value: cancelled, color: COLORS.cancelled },
  ].filter((x) => x.value > 0);

  const total = items.reduce((s, x) => s + x.value, 0);

  // If everything is 0 -> show a subtle ring
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <svg width="260" height="260" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="86" stroke="#E5E7EB" strokeWidth="24" fill="none" />
        </svg>
      </div>
    );
  }

  const cx = 130, cy = 130, r = 86;
  const stroke = 24;
  const gapDeg = 2; // tiny gap between segments

  let start = 0;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="260" height="260" viewBox="0 0 260 260">
        {/* background ring */}
        <circle cx={cx} cy={cy} r={r} stroke="#F3F4F6" strokeWidth={stroke} fill="none" />

        {items.map((it) => {
          const sweep = (it.value / total) * 360;
          const end = start + sweep - gapDeg;

          const d = arcPath(cx, cy, r, start, end);

          const out = (
            <path
              key={it.key}
              d={d}
              fill="none"
              stroke={it.color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          );

          start = start + sweep;
          return out;
        })}

        {/* inner cutout */}
        <circle cx={cx} cy={cy} r={r - stroke / 2} fill="white" />
      </svg>

      {/* legend (only non-zero items) */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-black/70">
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}