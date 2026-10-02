"use client";

import { useState } from "react";
import { CopyRow } from "@/components/CopyRow";
import { InstallPrompt } from "@/components/InstallPrompt";
import { RequireAccount } from "@/components/RequireAccount";
import { Button, Screen } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { arcChain } from "@/lib/arc";
import { shortAddress } from "@/lib/format";

export default function Settings() {
  const wallet = useWallet();
  const [confirming, setConfirming] = useState(false);

  return (
    <RequireAccount>
      {(account, handle) => (
        <Screen title="Settings" back="/">
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card px-4">
            <CopyRow label="Handle" value={`@${handle}`} />
            <CopyRow label="Account address" value={account.address} display={shortAddress(account.address)} />
            <a
              className="py-3 text-sm text-accent"
              href={`${arcChain.blockExplorers.default.url}/address/${account.address}`}
              target="_blank"
              rel="noreferrer"
            >
              View account on the Arc explorer
            </a>
          </div>

          <InstallPrompt />

          <div className="mt-auto flex flex-col gap-2">
            {confirming ? (
              <>
                <p className="text-sm text-muted">
                  You&apos;ll need the passkey saved on this device, or synced to your account, to sign back in. Your money
                  stays in your account.
                </p>
                <Button variant="secondary" onClick={() => wallet.signOut()}>
                  Sign out
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                Sign out
              </Button>
            )}
          </div>
        </Screen>
      )}
    </RequireAccount>
  );
}
