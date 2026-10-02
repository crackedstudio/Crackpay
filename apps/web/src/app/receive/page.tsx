"use client";

import { CopyRow } from "@/components/CopyRow";
import { QrCode } from "@/components/QrCode";
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
      {/* The code stands in for the avatar here: holding up a phone is the
          quickest way to be paid in person, so it earns the top of the screen. */}
      <div className="flex flex-col items-center gap-4 py-4">
        <QrCode value={link} label={`QR code to pay @${handle} on CrackPay`} />
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-semibold tracking-tight">@{handle}</span>
          <span className="text-sm text-muted">Scan with any phone camera to pay me</span>
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
