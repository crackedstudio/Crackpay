/**
 * A Mini App's tile. Apps host their own icon, so it may be missing, slow or
 * broken; the fallback is a lettered tile in a colour derived from the app's id,
 * so the same app always looks the same and a list never shows a hole.
 *
 * Rounded squares, not circles: a circle means a person in this app, a squircle
 * means an app.
 */
"use client";

import { useState } from "react";

const sizes = {
  sm: "h-9 w-9 rounded-[0.625rem] text-[0.8125rem]",
  md: "h-12 w-12 rounded-[0.875rem] text-base",
  lg: "h-16 w-16 rounded-[1.125rem] text-xl",
} as const;

function hue(seed: string): number {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) % 360;
  return hash;
}

export type AppIconApp = { id: string; name: string; icon?: string };

export function AppIcon({
  app,
  size = "md",
  className = "",
}: {
  app: AppIconApp;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const shape = `${sizes[size]} shrink-0 ${className}`;

  if (app.icon && !broken) {
    return (
      // Icons come from each app's own host, so next/image has no fixed domain to allow.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={app.icon}
        alt=""
        onError={() => setBroken(true)}
        className={`${shape} border border-line/60 bg-surface object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${shape} flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: `hsl(${hue(app.id)} 48% 40%)` }}
    >
      {app.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
