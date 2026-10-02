"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CopyRow } from "@/components/CopyRow";
import { InstallPrompt } from "@/components/InstallPrompt";
import { RequireAccount } from "@/components/RequireAccount";
import { Sheet } from "@/components/Sheet";
import { TabBar } from "@/components/TabBar";
import { useWallet } from "@/components/WalletProvider";
import { ChevronRight, External, Receipt, Shield, Wallet } from "@/components/icons";
import { Button, Card, ListRow, Screen } from "@/components/ui";
import { arcChain } from "@/lib/arc";
import { shortAddress } from "@/lib/format";
import type { CrackPaySmartAccount } from "@/lib/wallet";

function SettingsScreen({ account, handle }: { account: CrackPaySmartAccount; handle: string }) {
  const wallet = useWallet();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await wallet.signOut();
    // Take them to the welcome screen directly. Letting a guard bounce them out
    // of this page showed an empty frame on the way.
    router.replace("/");
  }

  return (
    <>
      <Screen title="Settings" inset>
        <div className="flex items-center gap-3 py-2">
          <Avatar seed={handle} size="lg" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xl font-semibold">@{handle}</span>
            <span className="numeric truncate text-sm text-muted">{shortAddress(account.address)}</span>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Your account</h2>
          <Card className="divide-y divide-line">
            <CopyRow label="Handle" value={`@${handle}`} />
            <CopyRow
              label="Account address"
              value={account.address}
              display={shortAddress(account.address)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <ListRow
              label="History"
              value="All your payments"
              icon={<Receipt className="h-5 w-5" />}
              href="/activity"
              trailing={<ChevronRight className="h-5 w-5 text-muted" />}
            />
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Security</h2>
          <Card className="divide-y divide-line">
            <ListRow
              label="Sign-in"
              value="Passkey on this device"
              icon={<Shield className="h-5 w-5" />}
            />
            <ListRow
              label="Public record"
              value="View on the Arc explorer"
              icon={<External className="h-5 w-5" />}
              href={`${arcChain.blockExplorers.default.url}/address/${account.address}`}
            />
          </Card>
        </section>

        <InstallPrompt />

        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Sign out
        </Button>
      </Screen>

      {confirming && (
        <Sheet title="Sign out?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-muted">
            Your money stays in your account — signing out only removes it from this browser. To get back in you&apos;ll need
            the passkey saved on this device, or synced to your phone account.
          </p>
          <div className="flex flex-col gap-2 pb-2">
            <Button variant="danger" loading={busy} onClick={signOut}>
              Sign out
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Stay signed in
            </Button>
          </div>
        </Sheet>
      )}

      <TabBar />
    </>
  );
}

export default function Settings() {
  return <RequireAccount>{(account, handle) => <SettingsScreen account={account} handle={handle} />}</RequireAccount>;
}
