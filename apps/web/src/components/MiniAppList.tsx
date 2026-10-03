"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ChevronRight, Shield } from "@/components/icons";
import { Card } from "@/components/ui";
import type { MiniApp } from "@/config/miniapps";
import { CATEGORY_LABELS, LISTING_CATEGORIES } from "@/lib/miniapp/listing";
import {
  parseRecentApps,
  recentAppsSnapshot,
  serverRecentAppsSnapshot,
  subscribeRecentApps,
} from "@/lib/miniapp/recent";

type Category = (typeof LISTING_CATEGORIES)[number];

const label = (category: string) => CATEGORY_LABELS[category as Category] ?? "More";

/** Which category an app sits under. The registry's default, for anything without one. */
const categoryOf = (app: MiniApp) => app.category ?? "utility";

/** The categories that actually have an app in them, in the catalogue's own order. */
function categoriesOf(apps: readonly MiniApp[]): string[] {
  const present = [...new Set(apps.map(categoryOf))];
  const known: string[] = LISTING_CATEGORIES.filter((category) => present.includes(category));
  // A category the registry allows but this build does not know about still needs a home.
  const unknown = present.filter((category) => !LISTING_CATEGORIES.includes(category as Category));
  return [...known, ...unknown];
}

/** One app in the list: what it is, who made it, and where it goes. */
function AppRow({ app }: { app: MiniApp }) {
  return (
    <Link href={`/apps/${app.id}`} className="pressable">
      <Card className="flex items-center gap-3.5 p-3.5">
        <AppIcon app={app} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">{app.name}</span>
          <span className="line-clamp-2 text-sm leading-snug text-muted">{app.description}</span>
          {app.publisher && <span className="truncate text-xs text-muted/80">{app.publisher}</span>}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </Card>
    </Link>
  );
}

/** The apps opened most recently, as a row of tiles to go straight back into. */
function RecentRow({ apps }: { apps: readonly MiniApp[] }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-sm font-semibold text-muted">Jump back in</h2>
      {/* Scrolls sideways past the screen edge, so the gutter is undone and redone inside. */}
      <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {apps.map((app) => (
          <li key={app.id} className="shrink-0">
            <Link
              href={`/apps/${app.id}`}
              className="pressable flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl py-1 text-center"
            >
              <AppIcon app={app} size="lg" className="shadow-card" />
              <span className="w-full truncate text-xs font-medium">{app.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The Apps screen's catalogue. Grouped by category, with the apps this browser
 * opened most recently pulled to the top, and a standing note on what an app is
 * allowed to do — the one thing a person should know before tapping into one.
 */
export function MiniAppList({ apps }: { apps: readonly MiniApp[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  // Empty on the server and during hydration, then whatever this browser stored.
  const stored = useSyncExternalStore(subscribeRecentApps, recentAppsSnapshot, serverRecentAppsSnapshot);
  const recentIds = useMemo(() => parseRecentApps(stored), [stored]);

  const categories = useMemo(() => categoriesOf(apps), [apps]);
  const recent = useMemo(
    () => recentIds.map((id) => apps.find((app) => app.id === id)).filter((app): app is MiniApp => app !== undefined),
    [apps, recentIds],
  );

  // Chips and headings only earn their space once there is a choice to make.
  const grouped = categories.length > 1;
  const showRecent = filter === null && recent.length > 0 && apps.length > recent.length;
  const shown = filter === null ? apps : apps.filter((app) => categoryOf(app) === filter);

  return (
    <>
      {grouped && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[null, ...categories].map((category) => {
            const active = filter === category;
            return (
              <button
                key={category ?? "all"}
                type="button"
                onClick={() => setFilter(category)}
                aria-pressed={active}
                className={`pressable h-9 shrink-0 rounded-full px-4 text-sm font-medium ${
                  active ? "bg-foreground text-background" : "border border-line bg-card text-muted"
                }`}
              >
                {category === null ? "All" : label(category)}
              </button>
            );
          })}
        </div>
      )}

      {showRecent && <RecentRow apps={recent} />}

      {grouped && filter === null ? (
        categories.map((category) => (
          <section key={category} className="flex flex-col gap-2.5">
            <h2 className="px-1 text-sm font-semibold text-muted">{label(category)}</h2>
            <div className="flex flex-col gap-3">
              {apps
                .filter((app) => categoryOf(app) === category)
                .map((app) => (
                  <AppRow key={app.id} app={app} />
                ))}
            </div>
          </section>
        ))
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((app) => (
            <AppRow key={app.id} app={app} />
          ))}
        </div>
      )}

      <div className="mt-auto flex items-start gap-3 rounded-2xl bg-surface p-4 text-sm text-muted">
        <Shield className="mt-px h-5 w-5 shrink-0" />
        <p>
          Apps run inside CrackPay and spend from your one balance. They ask you first every time, and none of them can
          see your passkey.
        </p>
      </div>
    </>
  );
}
