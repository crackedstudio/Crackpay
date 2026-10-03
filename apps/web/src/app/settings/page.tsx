"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { CopyRow } from "@/components/CopyRow";
import { InstallPrompt } from "@/components/InstallPrompt";
import { RequireAccount } from "@/components/RequireAccount";
import { Sheet } from "@/components/Sheet";
import { TabBar } from "@/components/TabBar";
import { useWallet } from "@/components/WalletProvider";
import { ChevronRight, Code, External, Receipt, Shield, Wallet } from "@/components/icons";
import { Button, ListRow, Screen, SectionHeading } from "@/components/ui";
import { arcChain } from "@/lib/arc";
import { developer, UNLOCK_TAPS } from "@/lib/developer";
import { shortAddress } from "@/lib/format";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import packageInfo from "../../../package.json";

const subscribe = () => () => {};

/**
 * A ruled list under a ruled heading. Settings has no cards: the rules divide
 * the page, as they do everywhere else.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <SectionHeading>{title}</SectionHeading>
      <div className="[&>*]:border-b [&>*]:border-hair [&>*]:px-0">{children}</div>
    </section>
  );
}

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
    <Section title="About">
      <ListRow
        layout="inline"
        label="Version"
        value={
          !unlocked && taps >= 3 ? (
            `${remaining} more to unlock developer settings`
          ) : (
            <span className="font-mono text-[0.8125rem]">{packageInfo.version}</span>
          )
        }
        onClick={tap}
      />
      {unlocked && (
        <ListRow
          layout="inline"
          label={<span className="text-base font-semibold text-ink">Developer settings</span>}
          icon={<Code className="h-5 w-5" />}
          href="/settings/developer"
          trailing={<ChevronRight className="h-5 w-5 text-muted" />}
        />
      )}
    </Section>
  );
}

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
        <div className="flex items-center gap-3.5 pt-1">
          <Avatar seed={handle} size="xl" ring />
          <div className="flex min-w-0 flex-col">
            <span className="ask truncate text-2xl font-extrabold">@{handle}</span>
            <span className="truncate font-mono text-[0.6875rem] text-muted">{shortAddress(account.address)}</span>
          </div>
        </div>

        <Section title="Your account">
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
        </Section>

        <Section title="Security">
          <ListRow label="Approves payments" value="Face or fingerprint on this phone" icon={<Shield className="h-5 w-5" />} />
          <ListRow
            label="Public record"
            value="View on the Arc explorer"
            icon={<External className="h-5 w-5" />}
            href={`${arcChain.blockExplorers.default.url}/address/${account.address}`}
          />
        </Section>

        <About />

        <InstallPrompt />

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button variant="danger" className="h-13" onClick={() => setConfirming(true)}>
            Sign out
          </Button>
          <p className="text-center text-[0.8125rem] leading-[1.4] text-muted">
            Your money stays in your account — signing out only removes it from this browser.
          </p>
        </div>
      </Screen>

      {confirming && (
        <Sheet title="Sign out?" onClose={() => setConfirming(false)}>
          <p className="text-sm leading-5 text-muted">
            Your money stays in your account — signing out only removes it from this browser. To get back in you&apos;ll need
            the passkey saved on this device, or synced to your phone account.
          </p>
          <div className="flex flex-col gap-2 pb-2">
            <Button variant="danger" loading={busy} onClick={signOut}>
              Sign out
            </Button>
            <Button variant="ghost" className="h-12" disabled={busy} onClick={() => setConfirming(false)}>
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
