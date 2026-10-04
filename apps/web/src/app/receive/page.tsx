"use client";

import { CopyRow } from "@/components/CopyRow";
import { PayTicket, payLink } from "@/components/PayTicket";
import { RequireAccount } from "@/components/RequireAccount";
import { useToast } from "@/components/Toast";
import { Link as LinkIcon, Share, Wallet } from "@/components/icons";
import { Button, Card, Screen } from "@/components/ui";
import { shortAddress } from "@/lib/format";
import type { Address } from "viem";

function ReceiveScreen({ address, handle }: { address: Address; handle: string }) {
  const toast = useToast();
  const link = payLink(handle);

  function share() {
    navigator
      .share({ title: "Pay me on CrackPay", text: `Pay @${handle} on CrackPay`, url: link })
      .catch((error: unknown) => {
        // Closing the share sheet is not an error worth reporting.
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Share failed", error);
        toast("Couldn't open the share sheet — copy the link instead");
      });
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Screen
      title="Receive"
      back="/"
      footer={
        canShare ? (
          <Button onClick={share}>
            <Share className="h-5 w-5" />
            Share my payment link
          </Button>
        ) : undefined
      }
    >
      {/* The code stands in for the avatar here: holding up a phone is the
          quickest way to be paid in person, so it earns the top of the screen. */}
      <PayTicket handle={handle} link={link} />
      <p className="text-center text-sm text-muted">Scan with any phone camera to pay me</p>

      <Card>
        <CopyRow label="Your handle" value={`@${handle}`} />
        <div className="border-t border-hair">
          <CopyRow label="Payment link" value={link} icon={<LinkIcon className="h-5 w-5" />} />
        </div>
        <div className="border-t border-hair">
          <CopyRow
            label="Account address"
            value={address}
            display={shortAddress(address)}
            icon={<Wallet className="h-5 w-5" />}
          />
        </div>
      </Card>

      {/* Quieter than a ruled callout: this is a note, not a warning about this payment. */}
      <div className="flex items-start gap-3 rounded-md bg-surface px-4 py-3.5 text-sm leading-5">
        <Wallet className="mt-px h-5 w-5 shrink-0 text-muted" />
        <p>
          Paying yourself in from another app or an exchange? Use the account address, and send{" "}
          <strong className="font-bold">USDC on Arc</strong>. Anything else will not arrive.
        </p>
      </div>
    </Screen>
  );
}

export default function Receive() {
  return (
    <RequireAccount>{(account, handle) => <ReceiveScreen address={account.address} handle={handle} />}</RequireAccount>
  );
}
