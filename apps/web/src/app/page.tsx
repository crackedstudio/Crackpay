"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ActivityList } from "@/components/ActivityList";
import { Avatar } from "@/components/Avatar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { TabBar } from "@/components/TabBar";
import { ArrowDown, ArrowUp, Bolt, Face, Grid, Refresh, Shield } from "@/components/icons";
import { Button, Card, LinkButton, Screen, ScreenSkeleton, Skeleton } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { useUsdcBalance } from "@/lib/balance";
import { dollars } from "@/lib/format";
import type { CrackPaySmartAccount } from "@/lib/wallet";

/** Three promises, in the order a first-time visitor cares about them. */
const promises = [
  { Icon: Bolt, text: "Payments land in a second, and sending is free." },
  { Icon: Face, text: "Your face or fingerprint approves every payment." },
  { Icon: Shield, text: "No seed phrase to write down or lose." },
] as const;

function Welcome() {
  return (
    <Screen
      footer={
        <>
          <LinkButton href="/onboarding">Get started</LinkButton>
          {/* In phone mode the same flow recognises a number that already has an
              account and offers its passkey, so both doors lead there. */}
          <LinkButton href={ONBOARDING_MODE === "phone" ? "/onboarding" : "/signin"} variant="ghost">
            I already have an account
          </LinkButton>
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-7 py-4">
        <div className="flex flex-col gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-accent-foreground">
            C
          </span>
          <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-tight">
            Send dollars
            <br />
            like a text.
          </h1>
          <p className="text-lg text-muted">A dollar account that lives on your phone.</p>
        </div>

        <ul className="flex flex-col gap-4">
          {promises.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-sm">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  );
}

const actions = [
  { href: "/send", label: "Send", Icon: ArrowUp },
  { href: "/receive", label: "Receive", Icon: ArrowDown },
  { href: "/apps", label: "Apps", Icon: Grid },
] as const;

function Home({ account, handle }: { account: CrackPaySmartAccount; handle: string }) {
  const { balance, refresh } = useUsdcBalance(account.address);

  return (
    <>
      <Screen
        inset
        lead={
          <Link href="/settings" className="pressable flex items-center gap-2.5">
            <Avatar seed={handle} size="sm" />
            <span className="font-semibold">@{handle}</span>
          </Link>
        }
        action={
          <Button size="md" variant="ghost" className="w-auto px-3" onClick={refresh} aria-label="Refresh balance">
            <Refresh className="h-5 w-5" />
          </Button>
        }
      >
        <Card className="flex flex-col items-center gap-1.5 px-5 py-9 shadow-card">
          <span className="text-sm font-medium text-muted">Your balance</span>
          {balance === null ? (
            <Skeleton className="my-2 h-11 w-40 rounded-2xl" />
          ) : (
            <span className="numeric text-[3.25rem] font-semibold leading-none">{dollars(balance)}</span>
          )}
        </Card>

        <nav className="grid grid-cols-3 gap-3">
          {actions.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="pressable flex flex-col items-center gap-2 rounded-3xl border border-line bg-card py-4 text-sm font-medium"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          ))}
        </nav>

        {balance === 0n && (
          <div className="flex flex-col gap-3 rounded-3xl bg-accent-soft p-5">
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-accent">Add your first dollars</p>
              <p className="text-sm text-accent/85">
                Share your handle with someone who already has CrackPay, and they can pay you straight away.
              </p>
            </div>
            <LinkButton href="/receive" size="md" variant="secondary">
              Share @{handle}
            </LinkButton>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/activity" className="text-sm font-medium text-muted">
              See all
            </Link>
          </div>
          {/* Reload the list whenever the balance moves. */}
          <ActivityList account={account.address} limit={5} refreshKey={balance} />
        </section>

        <InstallPrompt />
      </Screen>
      <TabBar />
    </>
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

  if (wallet.status === "loading" || needsOnboarding) return <ScreenSkeleton />;
  if (wallet.status === "signed-out") return <Welcome />;
  return <Home account={wallet.account} handle={wallet.handle ?? ""} />;
}
