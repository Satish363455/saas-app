"use client";

import React, { useMemo, useState } from "react";

type Props = {
  name?: string | null;
  size?: number;
  className?: string;
};

/**
 * Alias map:
 * normalized input -> official domain
 * Add new aliases here anytime.
 */
const DOMAIN_MAP: Record<string, string> = {
  // ---- Streaming ----
  netflix: "netflix.com",
  netflx: "netflix.com",

  hulu: "hulu.com",

  disney: "disneyplus.com",
  disneyplus: "disneyplus.com",

  max: "max.com",
  hbo: "hbomax.com",
  hbomax: "hbomax.com",

  youtube: "youtube.com",
  youtubepremium: "youtube.com",
  yt: "youtube.com",
  youube: "youtube.com",

  peacock: "peacocktv.com",
  paramount: "paramountplus.com",

  // ---- Amazon / Prime ----
  prime: "primevideo.com",
  primevideo: "primevideo.com",
  primevideos: "primevideo.com",
  primevides: "primevideo.com", // common typo
  amazonprime: "primevideo.com",
  amazonprimevideo: "primevideo.com",
  amazon: "amazon.com",

  // ---- Apple ----
  applemusic: "music.apple.com",
  appletv: "tv.apple.com",
  appletvplus: "tv.apple.com",

  // ---- Music ----
  spotify: "spotify.com",
  spotfy: "spotify.com",
  audible: "audible.com",
  pandora: "pandora.com",

  // ---- Cloud / Productivity ----
  dropbox: "dropbox.com",
  icloud: "icloud.com",
  googleone: "one.google.com",
  onedrive: "onedrive.live.com",
  notion: "notion.so",
  canva: "canva.com",
  zoom: "zoom.us",
  grammarly: "grammarly.com",

  // ---- Learning ----
  coursera: "coursera.org",
  udemy: "udemy.com",
  linkedin: "linkedin.com",
  duolingo: "duolingo.com",

  // ---- Shopping / Delivery ----
  walmart: "walmart.com",
  doordash: "doordash.com",
  uber: "uber.com",
  grubhub: "grubhub.com",
  instacart: "instacart.com",

  // ---- Security / VPN ----
  nordvpn: "nordvpn.com",
  expressvpn: "expressvpn.com",
  bitdefender: "bitdefender.com",
  onepassword: "1password.com",

  // ---- Creator / Web ----
  patreon: "patreon.com",
  substack: "substack.com",
  medium: "medium.com",
};

/**
 * Normalize user input:
 * - lowercase
 * - remove spaces, punctuation, +
 * This lets "You Tube", "prime vides", etc. resolve correctly.
 */
function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/\+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export default function MerchantIcon({
  name,
  size = 40,
  className = "",
}: Props) {
  const [error, setError] = useState(false);

  const domain = useMemo(() => {
    if (!name) return "";
    const key = normalize(name);
    return DOMAIN_MAP[key] || "";
  }, [name]);

  const src = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        domain
      )}&sz=${Math.max(32, size)}`
    : "";

  const fallbackLetter = (name ?? "S").charAt(0).toUpperCase();

  return (
    <div
      className={`grid place-items-center overflow-hidden rounded-xl border border-black/10 bg-white ${className}`}
      style={{ width: size, height: size }}
      title={name ?? "Subscription"}
      aria-label={name ?? "Subscription"}
    >
      {!error && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "icon"}
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          onError={() => setError(true)}
        />
      ) : (
        <span className="text-sm font-semibold text-black/70">
          {fallbackLetter}
        </span>
      )}
    </div>
  );
}