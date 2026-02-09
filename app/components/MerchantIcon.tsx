"use client";

import React, { useMemo, useState } from "react";

type Props = {
  name?: string | null;
  size?: number; // px
  className?: string;
};

/**
 * ✅ Put these SVGs in: public/icons/
 * - netflix.svg
 * - youtube.svg
 * - spotify.svg
 * - applemusic.svg
 * - amazonprime.svg
 * - amazon.svg (optional)
 * - default.svg (optional)
 *
 * IMPORTANT: Filenames must match EXACTLY.
 */

// exact-key match after sanitize
const ICON_MAP: Record<string, string> = {
  netflix: "netflix.svg",
  youtube: "youtube.svg",
  youtubepremium: "youtube.svg",
  yt: "youtube.svg",

  spotify: "spotify.svg",

  applemusic: "applemusic.svg",
  apple: "applemusic.svg", // optional (if user types "apple")
  music: "applemusic.svg", // optional

  amazon: "amazon.svg",
  amazonprime: "amazonprime.svg",
  prime: "amazonprime.svg",
  primevideo: "amazonprime.svg",
  primevideos: "amazonprime.svg",
};

function sanitizeName(name?: string | null) {
  if (!name) return "";
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * ✅ Better: detect "prime" anywhere:
 * - "Amazon Prime" -> amazonprime.svg
 * - "prime videos" -> amazonprime.svg
 * - "primevideo"   -> amazonprime.svg
 */
function pickFilename(originalName?: string | null) {
  const raw = String(originalName ?? "").toLowerCase();
  const key = sanitizeName(originalName);

  // 1) strong keyword detection (works even if user types spaces)
  // Prime variations
  if (raw.includes("prime")) return "amazonprime.svg";

  // Apple Music variations
  if (raw.includes("apple") && raw.includes("music")) return "applemusic.svg";
  if (raw.includes("applemusic")) return "applemusic.svg";

  // YouTube variations
  if (raw.includes("youtube") || raw.includes("you tube")) return "youtube.svg";

  // Spotify variations
  if (raw.includes("spotify")) return "spotify.svg";

  // Netflix variations
  if (raw.includes("netflix")) return "netflix.svg";

  // 2) exact sanitize key match
  if (ICON_MAP[key]) return ICON_MAP[key];

  // 3) optional: try direct file by sanitized name: <key>.svg
  // Example: if user types "mobile recharge" -> tries mobilerecharge.svg
  if (key) return `${key}.svg`;

  return null;
}

export default function MerchantIcon({ name, size = 40, className = "" }: Props) {
  const [hasError, setHasError] = useState(false);

  // ✅ reset error when name changes (important!)
  const filename = useMemo(() => pickFilename(name), [name]);

  // If name changes, we must allow image to try again
  React.useEffect(() => {
    setHasError(false);
  }, [filename]);

  const src = filename ? `/icons/${filename}` : null;
  const letter = (name ?? "S").charAt(0).toUpperCase();

  return (
    <div
      className={`grid place-items-center rounded-xl border border-black/10 bg-white ${className}`}
      style={{ width: size, height: size }}
      title={name ?? "Subscription"}
      aria-label={name ?? "Subscription"}
    >
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
        <span className="text-sm font-semibold text-black/70">{letter}</span>
      )}
    </div>
  );
}