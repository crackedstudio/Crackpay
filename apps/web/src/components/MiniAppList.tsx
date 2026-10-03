"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ChevronRight, Shield } from "@/components/icons";
import { Chip, Label, SectionHeading } from "@/components/ui";
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
    <Link href={`/apps/${app.id}`} className="pressable flex items-center gap-3.5 border-b border-hair py-3.5">
      <AppIcon app={app} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-bold">{app.name}</span>
        <span className="line-clamp-2 text-sm leading-[1.35] text-muted">{app.description}</span>
        {app.publisher && <span className="truncate font-mono text-[0.625rem] text-muted">{app.publisher}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}

/** The apps opened most recently, as a row of tiles to go straight back into. */
function RecentRow({ apps }: { apps: readonly MiniApp[] }) {
  return (
    <section className="flex flex-col gap-2.5">
      <Label>Jump back in</Label>
      {/* Scrolls sideways past the screen edge, so the gutter is undone and redone inside. */}
      <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {apps.map((app) => (
          <li key={app.id} className="shrink-0">
            <Link
              href={`/apps/${app.id}`}
              className="pressable flex w-[5.5rem] flex-col items-center gap-2.5 py-1 text-center"
            >
              <AppIcon app={app} size="lg" className="shadow-[3px_3px_0_var(--ink)]" />
              <span className="w-full truncate text-xs font-semibold">{app.name}</span>
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
              <Chip key={category ?? "all"} active={active} onClick={() => setFilter(category)}>
                {category === null ? "All" : label(category)}
              </Chip>
            );
          })}
        </div>
      )}

      {showRecent && <RecentRow apps={recent} />}

      {grouped && filter === null ? (
        categories.map((category) => (
          <section key={category} className="flex flex-col">
            <SectionHeading>{label(category)}</SectionHeading>
            {apps
              .filter((app) => categoryOf(app) === category)
              .map((app) => (
                <AppRow key={app.id} app={app} />
              ))}
          </section>
        ))
      ) : (
        <div className="flex flex-col border-t border-hair">
          {shown.map((app) => (
            <AppRow key={app.id} app={app} />
          ))}
        </div>
      )}

      <div className="mt-auto flex items-start gap-3 rounded-md border-[1.5px] border-ink px-4 py-3.5 text-sm leading-5">
        <Shield className="mt-px h-5 w-5 shrink-0" />
        <p>
          Apps run inside CrackPay and spend from your one balance. They ask you first every time, and none of them can
          see your passkey.
        </p>
      </div>
    </>
  );
}
