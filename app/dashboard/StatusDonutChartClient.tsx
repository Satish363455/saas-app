"use client";

import React from "react";
import StatusDonutChart from "./StatusDonutChart";

type Props = {
  active: number;
  renewSoon: number;
  expired: number;
  cancelled: number;
};

export default function StatusDonutChartClient(props: Props) {
  // render only on client (prevents hydration float mismatches)
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return <StatusDonutChart {...props} />;
}