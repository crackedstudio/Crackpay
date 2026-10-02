"use client";

import { Avatar } from "@/components/Avatar";
import { CopyRow } from "@/components/CopyRow";
import { RequireAccount } from "@/components/RequireAccount";
import { useToast } from "@/components/Toast";
import { Link as LinkIcon, Share, Wallet } from "@/components/icons";
import { Button, Callout, Card, Screen } from "@/components/ui";
import { shortAddress } from "@/lib/format";
import type { Address } from "viem";

function ReceiveScreen({ address, handle }: { address: Address; handle: string }) {
  const toast = useToast();
  const link = `${window.location.origin}/pay?to=${handle}`;

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
      <div className="flex flex-col items-center gap-3 py-6">
        <Avatar seed={handle} size="lg" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-semibold tracking-tight">@{handle}</span>
          <span className="text-sm text-muted">Anyone on CrackPay can pay you here</span>
        </div>
      </div>

      <Card className="divide-y divide-line">
        <CopyRow label="Your handle" value={`@${handle}`} />
        <CopyRow label="Payment link" value={link} icon={<LinkIcon className="h-5 w-5" />} />
        <CopyRow
          label="Account address"
          value={address}
          display={shortAddress(address)}
          icon={<Wallet className="h-5 w-5" />}
        />
      </Card>

      <Callout>
        Paying yourself in from another app or an exchange? Use the account address, and send <strong>USDC on Arc</strong>.
        Anything else will not arrive.
      </Callout>
    </Screen>
  );
}

export default function Receive() {
  return (
    <RequireAccount>{(account, handle) => <ReceiveScreen address={account.address} handle={handle} />}</RequireAccount>
  );
}
