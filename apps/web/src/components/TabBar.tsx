"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Gear, Grid, Home } from "./icons";

/**
 * Bottom navigation for the four places a signed-in user lives. Only top-level
 * screens show it; anything inside a flow uses a back arrow instead, so the user
 * is never offered a sideways exit in the middle of a payment.
 *
 * The active tab is marked by a go-green bar sitting on the rule, not by a
 * green icon — green on an icon would read as something to tap for money.
 */
const tabs = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/activity", label: "Activity", Icon: Clock },
  { href: "/apps", label: "Apps", Icon: Grid },
  { href: "/settings", label: "Settings", Icon: Gear },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-ink bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-[460px]">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`pressable relative flex flex-col items-center gap-1 pb-2.5 pt-2.5 text-[0.6875rem] ${
                  active ? "font-bold text-ink" : "font-medium text-muted"
                }`}
              >
                {active && <span aria-hidden className="absolute inset-x-[28%] -top-[1.5px] h-1 bg-go" />}
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
