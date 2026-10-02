import { describe, expect, it } from "vitest";
import type { Address, Hash } from "viem";
import type { ActivityItem } from "./activity";
import { toRecents } from "./recents";

const sam = "0x1111111111111111111111111111111111111111" as Address;
const ada = "0x2222222222222222222222222222222222222222" as Address;
const kim = "0x3333333333333333333333333333333333333333" as Address;

function item(counterparty: Address, handle: string | null, id: string): ActivityItem {
  return {
    id,
    direction: "out",
    counterparty,
    handle,
    amount: 1_000_000n,
    time: new Date("2026-10-01T12:00:00Z"),
    transactionHash: `0x${id}` as Hash,
  };
}

describe("toRecents", () => {
  it("keeps the newest mention of each person, in order", () => {
    const recents = toRecents([item(sam, "sam", "a"), item(ada, "ada", "b"), item(sam, "sam", "c")]);
    expect(recents.map((recent) => recent.label)).toEqual(["@sam", "@ada"]);
  });

  it("falls back to a short address for someone with no handle", () => {
    expect(toRecents([item(kim, null, "a")])[0]?.label).toBe("0x3333…3333");
  });

  it("stops at the limit", () => {
    const items = [item(sam, "sam", "a"), item(ada, "ada", "b"), item(kim, "kim", "c")];
    expect(toRecents(items, 2)).toHaveLength(2);
  });

  it("has nothing to show for an account with no history", () => {
    expect(toRecents([])).toEqual([]);
  });
});
