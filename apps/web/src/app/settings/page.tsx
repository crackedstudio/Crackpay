"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { CopyRow } from "@/components/CopyRow";
import { InstallPrompt } from "@/components/InstallPrompt";
import { RequireAccount } from "@/components/RequireAccount";
import { Button, Screen } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { arcChain } from "@/lib/arc";
import { developer, UNLOCK_TAPS } from "@/lib/developer";
import { shortAddress } from "@/lib/format";
import packageInfo from "../../../package.json";

const subscribe = () => () => {};

/** The version row. Tapping it repeatedly reveals Developer settings, as in MiniPay. */
function About() {
  const stored = useSyncExternalStore(subscribe, developer.isUnlocked, () => false);
  const [taps, setTaps] = useState(0);
  const unlocked = stored || taps >= UNLOCK_TAPS;

  function tap() {
    const next = taps + 1;
    setTaps(next);
    if (next === UNLOCK_TAPS) developer.unlock();
  }

  const remaining = UNLOCK_TAPS - taps;
  return (
    <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card px-4">
      <button onClick={tap} className="flex items-center justify-between py-3 text-left text-sm">
        <span className="text-muted">Version</span>
        <span>
          {!unlocked && taps >= 3 ? `${remaining} more to unlock developer settings` : packageInfo.version}
        </span>
      </button>
      {unlocked && (
        <Link href="/settings/developer" className="flex items-center justify-between py-3 text-sm">
          <span>Developer settings</span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>
      )}
    </div>
  );
}

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

          <About />

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
