"use client";

import type { ReactNode } from "react";
import type { ActivityItem } from "@/lib/activity";
import { arcChain } from "@/lib/arc";
import { dollars, shortAddress } from "@/lib/format";
import { formatAmountExact } from "@/lib/money";
import { Avatar } from "./Avatar";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { Copy, External } from "./icons";
import { Label } from "./ui";

const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** One line of the slip: a mono label on the left, the fact on the right. */
function Line({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center py-3 ${last ? "" : "border-b border-dashed border-hair"}`}>
      <Label>{label}</Label>
      <span className="ml-auto min-w-0 truncate pl-3 font-semibold">{children}</span>
    </div>
  );
}

/**
 * The detail behind one activity row, in the app. Tapping a payment used to
 * throw the user out to a block explorer; the explorer is still here, but as a
 * choice rather than the only option.
 *
 * It is set like a till slip — ruled top and bottom, dashed between lines —
 * because that is what a receipt looks like to someone who has never used a
 * block explorer and never needs to.
 */
export function ReceiptSheet({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const toast = useToast();
  const incoming = item.direction === "in";
  const who = item.handle ? `@${item.handle}` : shortAddress(item.counterparty);
  const exact = formatAmountExact(item.amount);

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(item.transactionHash);
      toast("Transaction copied");
    } catch (error) {
      console.error("Copy failed", error);
      toast("Couldn't copy — select the text instead");
    }
  }

  return (
    <Sheet title={incoming ? "Received" : "Sent"} onClose={onClose}>
      <div className="flex items-center gap-3.5">
        <Avatar seed={item.handle ?? item.counterparty} size="lg" ring />
        <div className="flex min-w-0 flex-col">
          <span className={`figure text-4xl ${incoming ? "text-money" : "text-ink"}`}>
            {incoming ? "+" : "−"}
            {dollars(item.amount)}
          </span>
          <span className="truncate text-muted">
            {incoming ? "from" : "to"} {who}
          </span>
        </div>
      </div>

      <div className="border-y-[1.5px] border-ink text-sm">
        <Line label={incoming ? "From" : "To"}>{who}</Line>
        {/* The displayed figure rounds to cents; the receipt shows every unit that moved. */}
        {exact !== dollars(item.amount).slice(1) && <Line label="Exact amount">${exact}</Line>}
        <Line label="Date">{stamp.format(item.time)}</Line>
        <Line label="Network fee">Free</Line>
        <button type="button" onClick={copyHash} className="pressable flex w-full items-center py-3 text-left text-sm">
          <Label>Transaction</Label>
          <span className="ml-auto truncate pl-3 font-mono text-[0.8125rem] font-semibold">
            {shortAddress(item.transactionHash)}
          </span>
          <Copy className="ml-2 h-4 w-4 shrink-0 text-muted" />
        </button>
      </div>

      <a
        href={`${arcChain.blockExplorers.default.url}/tx/${item.transactionHash}`}
        target="_blank"
        rel="noreferrer"
        className="pressable flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-ink bg-paper text-sm font-semibold"
      >
        View on the Arc explorer
        <External className="h-4 w-4" />
      </a>
    </Sheet>
  );
}
