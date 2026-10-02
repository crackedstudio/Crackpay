"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { fetchActivity, type ActivityItem } from "./activity";
import { shortAddress } from "./format";

/**
 * People the user has paid or been paid by, newest first. Standing in for the
 * saved-contacts list in the plan: it needs no storage and no device contact
 * access, and it covers the common case of paying the same few people again.
 */
export type Recent = { address: Address; label: string };

export function toRecents(items: readonly ActivityItem[], limit = 4): Recent[] {
  const seen = new Set<Address>();
  const recents: Recent[] = [];
  for (const item of items) {
    if (seen.has(item.counterparty)) continue;
    seen.add(item.counterparty);
    recents.push({
      address: item.counterparty,
      label: item.handle ? `@${item.handle}` : shortAddress(item.counterparty),
    });
    if (recents.length === limit) break;
  }
  return recents;
}

export function useRecents(account: Address): readonly Recent[] {
  const [recents, setRecents] = useState<readonly Recent[]>([]);

  useEffect(() => {
    let current = true;
    fetchActivity(account, 25).then(
      (items) => current && setRecents(toRecents(items)),
      // Recents are a shortcut, never the only way through. Losing them is not an error to show.
      (error: unknown) => console.error("Recents load failed", error),
    );
    return () => {
      current = false;
    };
  }, [account]);

  return recents;
}
