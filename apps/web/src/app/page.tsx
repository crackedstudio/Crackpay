"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ActivityList } from "@/components/ActivityList";
import { Avatar } from "@/components/Avatar";
import { Mark } from "@/components/Brand";
import { InstallPrompt } from "@/components/InstallPrompt";
import { TabBar } from "@/components/TabBar";
import { ArrowDown, ArrowUp, Eye, EyeOff, Refresh } from "@/components/icons";
import { IconButton, Label, LinkButton, Screen, ScreenSkeleton, Skeleton } from "@/components/ui";
import { useWallet } from "@/components/WalletProvider";
import { ONBOARDING_MODE } from "@/config/onboarding";
import { useUsdcBalance } from "@/lib/balance";
import { dollars } from "@/lib/format";
import { HIDDEN_AMOUNT, setAmountsHidden, useAmountsHidden } from "@/lib/privacy";
import type { CrackPaySmartAccount } from "@/lib/wallet";

/**
 * Three promises, in the order a first-time visitor cares about them. They are
 * a numbered ledger rather than three icon tiles, so the only green on the
 * screen is the one button that says go.
 */
const promises = [
  "Payments land in a second, and sending is free.",
  "Your face or fingerprint approves every payment.",
  "No seed phrase to write down or lose.",
] as const;

function Welcome() {
  return (
    <Screen
      footer={
        <>
          <LinkButton href="/onboarding">Get started</LinkButton>
          {/* In phone mode the same flow recognises a number that already has an
              account and offers its passkey, so both doors lead there. */}
          <LinkButton href={ONBOARDING_MODE === "phone" ? "/onboarding" : "/signin"} variant="ghost" className="h-12">
            I already have an account
          </LinkButton>
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-9 py-4">
        <div className="flex flex-col gap-5">
          <Mark className="h-14 w-[3.4rem]" />
          <h1 className="display text-[2.75rem] leading-[0.98] text-balance">Send dollars like a text.</h1>
          <p className="text-lg leading-[1.45] text-muted">A dollar account that lives on your phone.</p>
        </div>

        <ol className="border-t-[1.5px] border-ink">
          {promises.map((text, index) => (
            <li
              key={text}
              className={`flex items-baseline gap-4 py-3.5 ${
                index === promises.length - 1 ? "border-b-[1.5px] border-ink" : "border-b border-hair"
              }`}
            >
              <span className="font-mono text-xs font-semibold">{`0${index + 1}`}</span>
              <span className="text-[0.9375rem] leading-[1.45]">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </Screen>
  );
}

/** A million dollars is the point where the figure has to give way to the column. */
const MILLION = 1_000_000_000_000n;

function Home({ account, handle }: { account: CrackPaySmartAccount; handle: string }) {
  const { balance, refresh } = useUsdcBalance(account.address);
  const hidden = useAmountsHidden();

  return (
    <>
      <Screen
        inset
        footerRule
        lead={
          <Link href="/settings" className="pressable flex items-center gap-2.5">
            <Avatar seed={handle} size="sm" />
            <span className="font-semibold">@{handle}</span>
          </Link>
        }
        action={
          <IconButton label="Refresh balance" onClick={refresh} className="text-muted">
            <Refresh className="h-5 w-5" />
          </IconButton>
        }
        footer={
          /* The two things anyone opens this app to do, in the thumb zone.
             Apps is not here: it already has a tab. */
          <div className="grid grid-cols-2 gap-2.5">
            <LinkButton href="/add-money" className="h-15 text-[1.0625rem] font-bold">
              <ArrowDown className="h-5 w-5" strokeWidth={2.25} />
              Deposit
            </LinkButton>
            <LinkButton href="/send" variant="secondary" className="h-15 text-[1.0625rem] font-bold">
              <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
              Withdraw
            </LinkButton>
          </div>
        }
      >
        {/* The balance sits on the page, not in a card. It is the page. */}
        <div className="flex flex-col gap-2 border-b-[1.5px] border-ink pt-5">
          <div className="flex items-center justify-between">
            <Label>Your balance</Label>
            <IconButton
              label={hidden ? "Show balance" : "Hide balance"}
              aria-pressed={hidden}
              onClick={() => setAmountsHidden(!hidden)}
              className="-my-2 -mr-2 text-muted"
            >
              {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </IconButton>
          </div>
          {balance === null ? (
            <Skeleton className="mb-4.5 h-[3.75rem] w-56" />
          ) : hidden ? (
            <span className="figure pb-4.5 text-[3.75rem]" aria-label="Balance hidden">
              {HIDDEN_AMOUNT}
            </span>
          ) : (
            <span className={`figure pb-4.5 ${balance >= MILLION ? "text-[2.75rem]" : "text-[3.75rem]"}`}>
              {dollars(balance)}
            </span>
          )}
        </div>

        {balance === 0n && (
          <div className="flex flex-col gap-3 rounded-lg border-[1.5px] border-dashed border-ink p-4.5">
            <div className="flex flex-col gap-1">
              <p className="text-[1.0625rem] font-bold">Add your first dollars</p>
              <p className="text-sm leading-5 text-muted">
                Get paid by someone on CrackPay, claim a KashLink, or move USDC in from another wallet.
              </p>
            </div>
            <LinkButton href="/add-money" size="md" variant="secondary">
              Deposit
            </LinkButton>
          </div>
        )}

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="label text-ink">Recent</h2>
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
