"use client";

import { Mark } from "@/components/Brand";
import { CopyRow } from "@/components/CopyRow";
import { QrCode } from "@/components/QrCode";
import { RequireAccount } from "@/components/RequireAccount";
import { useToast } from "@/components/Toast";
import { Link as LinkIcon, Share, Wallet } from "@/components/icons";
import { Button, Card, Screen } from "@/components/ui";
import { shortAddress } from "@/lib/format";
import type { Address } from "viem";

/**
 * The ticket stays black on white in both schemes, like the code inside it: it
 * is held up to a stranger's camera in daylight, and half of it is a QR.
 */
const TICKET_INK = "#12100e";
const TICKET_PAPER = "#f3f1ec";

function Ticket({ handle, link }: { handle: string; link: string }) {
  return (
    <div
      className="w-[17rem] self-center overflow-hidden rounded-[0.625rem] border-2"
      style={{ borderColor: TICKET_INK, background: "#ffffff", color: TICKET_INK, boxShadow: `6px 6px 0 ${TICKET_INK}` }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: TICKET_INK, color: TICKET_PAPER }}
      >
        <span className="flex items-center gap-2">
          <Mark className="h-[1.3125rem] w-5" />
          <span className="display text-[0.9375rem]">CrackPay</span>
        </span>
        <span className="font-mono text-[0.625rem] font-semibold tracking-[0.1em]">SCAN TO PAY</span>
      </div>

      <div className="p-3.5">
        <QrCode value={link} label={`QR code to pay @${handle} on CrackPay`} />
      </div>

      {/* The tear line: a receipt you hand over, not a card you own. */}
      <div className="flex flex-col gap-0.5 border-t-2 border-dashed px-3.5 pb-3.5 pt-3" style={{ borderColor: TICKET_INK }}>
        <span className="display text-[1.625rem]">@{handle}</span>
        <span className="truncate font-mono text-[0.6875rem]" style={{ color: "#5c564f" }}>
          {link.replace(/^https?:\/\//, "")}
        </span>
      </div>
    </div>
  );
}

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
      <Ticket handle={handle} link={link} />
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
