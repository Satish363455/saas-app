"use client";

import React, { useState } from "react";

type Props = {
  name?: string | null;
  size?: number; // px
  className?: string;
};

const ICON_MAP: Record<string, string> = {
  netflix: "netflix.svg",
  youtube: "youtube.svg",
  spotify: "spotify.svg",
  applemusic: "applemusic.svg",
  amazon: "amazon.svg",
  amazonprime: "amazonprime.svg",
  linkedin: "linkedin.svg",
};

function sanitizeName(name?: string | null) {
  if (!name) return "";
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function MerchantIcon({
  name,
  size = 40,
  className = "",
}: Props) {
  const [hasError, setHasError] = useState(false);

  const key = sanitizeName(name);
  const filename =
    ICON_MAP[key] || (key ? `${key}.svg` : null);

  const src = filename ? `/icons/${filename}` : null;
  const letter = (name ?? "S").charAt(0).toUpperCase();

  return (
    <div
      className={`grid place-items-center rounded-xl border border-black/10 bg-white ${className}`}
      style={{ width: size, height: size }}
      title={name ?? "Subscription"}
      aria-label={name ?? "Subscription"}
    >
      {/* Show SVG if available and no error */}
      {!hasError && src ? (
        <img
          src={src}
          alt={name ?? "icon"}
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          onError={() => setHasError(true)}
        />
      ) : (
        /* Fallback letter */
        <span className="text-sm font-semibold text-black/70">
          {letter}
        </span>
      )}
    </div>
  );
}