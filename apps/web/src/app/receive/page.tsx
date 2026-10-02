"use client";

import { CopyRow } from "@/components/CopyRow";
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
            <section className="flex flex-col items-center gap-1 py-6">
              <span className="text-sm text-muted">Anyone on CrackPay can pay you at</span>
              <span className="text-4xl font-semibold tracking-tight">@{handle}</span>
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
