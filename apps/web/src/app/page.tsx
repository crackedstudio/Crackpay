"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ActivityList } from "@/components/ActivityList";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LinkButton, Screen } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { useUsdcBalance } from "@/lib/balance";
import { dollars } from "@/lib/format";
import type { CrackPaySmartAccount } from "@/lib/wallet";

function Welcome() {
  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <p className="text-sm font-medium text-accent">CrackPay</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Send dollars like a text.</h1>
        <p className="text-muted">A dollar account on your phone. No fees to send, no seed phrase to lose.</p>
      </div>
      <LinkButton href="/onboarding">Get started</LinkButton>
      <LinkButton href={ONBOARDING_MODE === "phone" ? "/onboarding" : "/signin"} variant="ghost">
        I already have an account
      </LinkButton>
    </Screen>
  );
}

const actions = [
  { href: "/send", label: "Send", icon: "↑" },
  { href: "/receive", label: "Receive", icon: "↓" },
  { href: "/apps", label: "Apps", icon: "▦" },
] as const;

function Home({ account, handle }: { account: CrackPaySmartAccount; handle: string }) {
  const { balance } = useUsdcBalance(account.address);

  return (
    <Screen>
      <header className="flex h-10 items-center justify-between">
        <span className="font-medium">@{handle}</span>
        <Link href="/settings" className="text-sm text-muted">
          Settings
        </Link>
      </header>

      <section className="flex flex-col items-center gap-1 py-8">
        <span className="text-sm text-muted">Balance</span>
        <span className="text-5xl font-semibold tracking-tight tabular-nums">{balance === null ? "$—" : dollars(balance)}</span>
      </section>

      <nav className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-4 text-sm font-medium"
          >
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg text-accent-foreground">
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </nav>

      {balance === 0n && (
        <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          Your balance is empty. Tap Receive and share your handle to get paid.
        </p>
      )}

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent activity</h2>
          <Link href="/activity" className="text-sm text-muted">
            See all
          </Link>
        </div>
        {/* Reload the list whenever the balance moves. */}
        <ActivityList account={account.address} limit={5} refreshKey={balance} />
      </section>

      <InstallPrompt />
    </Screen>
  );
}

export default function Start() {
  const wallet = useWallet();
  const router = useRouter();
  const needsOnboarding = wallet.status === "ready" && !wallet.handle;

  useEffect(() => {
    // A passkey exists but registration never finished: pick up where it stopped.
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (wallet.status === "loading" || needsOnboarding) return null;
  if (wallet.status === "signed-out") return <Welcome />;
  return <Home account={wallet.account} handle={wallet.handle ?? ""} />;
}
