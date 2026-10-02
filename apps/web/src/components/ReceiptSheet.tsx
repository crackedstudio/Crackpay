"use client";

import type { ActivityItem } from "@/lib/activity";
import { arcChain } from "@/lib/arc";
import { dollars, shortAddress } from "@/lib/format";
import { formatAmountExact } from "@/lib/money";
import { Avatar } from "./Avatar";
import { CopyRow } from "./CopyRow";
import { Sheet } from "./Sheet";
import { External } from "./icons";
import { Card, ListRow } from "./ui";

const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * The detail behind one activity row, in the app. Tapping a payment used to
 * throw the user out to a block explorer; the explorer is still here, but as a
 * choice rather than the only option.
 */
export function ReceiptSheet({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const incoming = item.direction === "in";
  const who = item.handle ? `@${item.handle}` : shortAddress(item.counterparty);
  const exact = formatAmountExact(item.amount);

  return (
    <Sheet title={incoming ? "Received" : "Sent"} onClose={onClose}>
      <div className="flex flex-col items-center gap-3 pb-2">
        <Avatar seed={item.handle ?? item.counterparty} size="lg" />
        <div className="flex flex-col items-center gap-0.5">
          <p className={`numeric text-4xl font-semibold ${incoming ? "text-accent" : ""}`}>
            {incoming ? "+" : "−"}
            {dollars(item.amount)}
          </p>
          <p className="text-muted">
            {incoming ? "from" : "to"} {who}
          </p>
        </div>
      </div>

      <Card className="divide-y divide-line">
        <ListRow layout="inline" label={incoming ? "From" : "To"} value={who} />
        {/* The displayed figure rounds to cents; the receipt shows every unit that moved. */}
        {exact !== dollars(item.amount).slice(1) && <ListRow layout="inline" label="Exact amount" value={`$${exact}`} />}
        <ListRow layout="inline" label="Date" value={stamp.format(item.time)} />
        <ListRow layout="inline" label="Network fee" value="Free" />
        <CopyRow label="Transaction" value={item.transactionHash} display={shortAddress(item.transactionHash)} />
      </Card>

      <a
        href={`${arcChain.blockExplorers.default.url}/tx/${item.transactionHash}`}
        target="_blank"
        rel="noreferrer"
        className="pressable flex h-12 items-center justify-center gap-2 rounded-full bg-surface text-sm font-medium"
      >
        View on the Arc explorer
        <External className="h-4 w-4" />
      </a>
    </Sheet>
  );
}
