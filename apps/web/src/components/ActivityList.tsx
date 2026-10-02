"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { fetchActivity, type ActivityItem } from "@/lib/activity";
import { arcChain } from "@/lib/arc";
import { dollars, shortAddress } from "@/lib/format";

const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function ActivityList({ account, limit, refreshKey }: { account: Address; limit: number; refreshKey?: unknown }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    fetchActivity(account, limit).then(
      (next) => current && (setItems(next), setFailed(false)),
      (error: unknown) => {
        console.error("Activity load failed", error);
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [account, limit, refreshKey]);

  if (failed && !items) return <p className="text-sm text-muted">Couldn&apos;t load activity. Pull to refresh or try again later.</p>;
  if (!items) return <p className="text-sm text-muted">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-muted">Nothing yet. Money you send and receive will show up here.</p>;

  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => {
        const who = item.handle ? `@${item.handle}` : shortAddress(item.counterparty);
        return (
          <li key={item.id}>
            <a
              href={`${arcChain.blockExplorers.default.url}/tx/${item.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="flex flex-col">
                <span className="font-medium">{item.direction === "out" ? `To ${who}` : `From ${who}`}</span>
                <span className="text-sm text-muted">{day.format(item.time)}</span>
              </span>
              <span className={`font-medium tabular-nums ${item.direction === "in" ? "text-accent" : ""}`}>
                {item.direction === "in" ? "+" : "−"}
                {dollars(item.amount)}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
