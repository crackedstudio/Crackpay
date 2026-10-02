"use client";

import { CopyRow } from "@/components/CopyRow";
import { QrCode } from "@/components/QrCode";
import { RequireAccount } from "@/components/RequireAccount";
import { Button, Screen } from "@/components/ui";
import { shortAddress } from "@/lib/format";

function share(handle: string, link: string) {
  navigator.share({ title: "Pay me on CrackPay", text: `Pay @${handle} on CrackPay`, url: link }).catch((error: unknown) => {
    // Closing the share sheet is not an error worth reporting.
    if (!(error instanceof Error && error.name === "AbortError")) console.error("Share failed", error);
  });
}

export default function Receive() {
  return (
    <RequireAccount>
      {(account, handle) => {
        const link = `${window.location.origin}/pay?to=${handle}`;
        return (
          <Screen title="Receive" back="/">
            <section className="flex flex-col items-center gap-4 py-2">
              <QrCode value={link} label={`QR code to pay @${handle} on CrackPay`} />
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-semibold tracking-tight">@{handle}</span>
                <span className="text-sm text-muted">Scan with any phone camera to pay me</span>
              </div>
            </section>
            <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card px-4">
              <CopyRow label="Your handle" value={`@${handle}`} />
              <CopyRow label="Payment link" value={link} />
              <CopyRow label="Account address (Arc, USDC only)" value={account.address} display={shortAddress(account.address)} />
            </div>
            <p className="text-sm text-muted">
              Sending from another app or exchange? Use the account address, and make sure it is USDC on the Arc network.
            </p>
            {"share" in navigator && (
              <div className="mt-auto">
                <Button onClick={() => share(handle, link)}>Share payment link</Button>
              </div>
            )}
          </Screen>
        );
      }}
    </RequireAccount>
  );
}
