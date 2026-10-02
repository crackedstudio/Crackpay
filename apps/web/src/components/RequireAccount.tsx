"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { currentPath, withNext } from "@/lib/routing";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import { ScreenSkeleton } from "./ui";
import { useWallet } from "./WalletProvider";

/**
 * Renders `children` for a signed-in, registered user. Anyone else is sent to
 * sign in, or back to onboarding if they hold a passkey but never finished.
 *
 * The route they were turned away from travels with them as `next`, so a payment
 * link opened cold still ends up on the right screen once they are set up.
 * While we work out which of those is true, a skeleton holds the screen — a
 * blank page here reads as a broken app.
 */
export function RequireAccount({ children }: { children: (account: CrackPaySmartAccount, handle: string) => ReactNode }) {
  const wallet = useWallet();
  const router = useRouter();
  const needsOnboarding = wallet.status === "ready" && !wallet.handle;

  useEffect(() => {
    if (wallet.status !== "signed-out" && !needsOnboarding) return;
    const next = currentPath(window.location);
    router.replace(withNext(wallet.status === "signed-out" ? "/signin" : "/onboarding", next));
  }, [wallet.status, needsOnboarding, router]);

  if (wallet.status !== "ready" || !wallet.handle) return <ScreenSkeleton />;
  return <>{children(wallet.account, wallet.handle)}</>;
}
