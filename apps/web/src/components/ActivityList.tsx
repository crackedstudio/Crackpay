"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { fetchActivity, type ActivityItem } from "@/lib/activity";
import { dollars, shortAddress } from "@/lib/format";
import { Avatar } from "./Avatar";
import { ReceiptSheet } from "./ReceiptSheet";
import { ArrowDown, ArrowUp, Refresh } from "./icons";
import { Button, EmptyState, SectionHeading, Skeleton } from "./ui";

const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeLabel = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** "Today" and "Yesterday" read better than a date, and that is most of the list. */
function heading(time: Date): string {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const days = Math.floor((midnight.getTime() - time.getTime()) / 86_400_000);
  if (days < 0) return "Today";
  if (days < 1) return "Yesterday";
  return dayLabel.format(time);
}

function groupByDay(items: readonly ActivityItem[]): [string, ActivityItem[]][] {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const key = heading(item.time);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups];
}

function Rows() {
  return (
    <div className="flex flex-col gap-5 py-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <Skeleton className="h-[2.625rem] w-[2.625rem] rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * One payment. The badge on the avatar is the direction, the amount's colour is
 * the direction again — money green only ever means money arriving.
 */
function Row({ item, when, onOpen }: { item: ActivityItem; when: string; onOpen: () => void }) {
  const incoming = item.direction === "in";
  const who = item.handle ? `@${item.handle}` : shortAddress(item.counterparty);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="pressable flex w-full items-center gap-3 border-b border-hair py-3 text-left"
      >
        <span className="relative shrink-0">
          <Avatar seed={item.handle ?? item.counterparty} />
          <span
            className={`absolute -bottom-[3px] -right-[3px] flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-ink ${
              incoming ? "bg-go text-go-ink" : "bg-card text-ink"
            }`}
          >
            {incoming ? (
              <ArrowDown className="h-[0.6875rem] w-[0.6875rem]" strokeWidth={2.5} />
            ) : (
              <ArrowUp className="h-[0.6875rem] w-[0.6875rem]" strokeWidth={2.5} />
            )}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate font-semibold">{who}</span>
          <span className="font-mono text-[0.6875rem] text-muted">{when}</span>
        </span>
        <span className={`numeric shrink-0 font-bold ${incoming ? "text-money" : "text-ink"}`}>
          {incoming ? "+" : "−"}
          {dollars(item.amount)}
        </span>
      </button>
    </li>
  );
}

export function ActivityList({
  account,
  limit,
  refreshKey,
  grouped = false,
  emptyAction,
}: {
  account: Address;
  limit: number;
  refreshKey?: unknown;
  /** Day headings with a count, for the full history. Home shows a flat list. */
  grouped?: boolean;
  /** Shown in the empty state — on Home this is the nudge to get funded. */
  emptyAction?: ReactNode;
}) {
  const [items, setItems] = useState<readonly ActivityItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<ActivityItem | null>(null);

  useEffect(() => {
    let current = true;
    fetchActivity(account, limit).then(
      (next) => {
        if (!current) return;
        setItems(next);
        setFailed(false);
      },
      (error: unknown) => {
        console.error("Activity load failed", error);
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [account, limit, refreshKey, attempt]);

  if (failed && !items) {
    return (
      <EmptyState
        icon={<Refresh className="h-6 w-6" />}
        title="Couldn't load activity"
        body="Your money is safe — this is only the history view. Check your connection and try again."
        action={
          <Button size="md" variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!items) return <Rows />;

  if (items.length === 0) {
    return (
      <EmptyState
        figure="$0.00"
        title="No payments yet"
        body="Money you send and receive shows up here, with a receipt for each one."
        action={emptyAction}
      />
    );
  }

  const receipt = open && <ReceiptSheet item={open} onClose={() => setOpen(null)} />;

  if (!grouped) {
    return (
      <>
        <ul className="border-t border-hair">
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              when={`${heading(item.time)} · ${timeLabel.format(item.time)}`}
              onOpen={() => setOpen(item)}
            />
          ))}
        </ul>
        {receipt}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {groupByDay(items).map(([label, group]) => (
          <section key={label} className="flex flex-col gap-1.5">
            <SectionHeading
              level={3}
              trailing={<span className="font-medium text-muted">{group.length === 1 ? "1 payment" : `${group.length} payments`}</span>}
            >
              {label}
            </SectionHeading>
            <ul>
              {group.map((item) => (
                <Row key={item.id} item={item} when={timeLabel.format(item.time)} onOpen={() => setOpen(item)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {receipt}
    </>
  );
}
