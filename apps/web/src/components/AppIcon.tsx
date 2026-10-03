/**
 * A Mini App's tile. Apps host their own icon, so it may be missing, slow or
 * broken; the fallback is a lettered tile in a colour derived from the app's id,
 * so the same app always looks the same and a list never shows a hole.
 *
 * Rounded squares, not circles: a circle means a person in this app, a squircle
 * means an app. Both are ink-ringed, so a third-party icon cannot bleed into
 * the page.
 */
"use client";

import { useState } from "react";
import { paletteFor } from "./Avatar";

const sizes = {
  sm: "h-9 w-9 rounded-[0.625rem] text-sm",
  md: "h-12 w-12 rounded-[0.875rem] text-lg",
  lg: "h-16 w-16 rounded-[1.125rem] text-2xl",
} as const;

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
  const shape = `${sizes[size]} shrink-0 border-[1.5px] border-ink ${className}`;

  if (app.icon && !broken) {
    return (
      // Icons come from each app's own host, so next/image has no fixed domain to allow.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={app.icon} alt="" onError={() => setBroken(true)} className={`${shape} bg-surface object-cover`} />
    );
  }

  const { bg, fg } = paletteFor(app.id);
  return (
    <span
      aria-hidden
      className={`${shape} flex items-center justify-center font-extrabold`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {app.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
