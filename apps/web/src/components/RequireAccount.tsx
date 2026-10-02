"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import { useWallet } from "./WalletProvider";

/**
 * Renders `children` for a signed-in, registered user. Anyone else is sent to
 * the start (signed out) or back to onboarding (passkey but no handle yet).
 */
export function RequireAccount({ children }: { children: (account: CrackPaySmartAccount, handle: string) => ReactNode }) {
  const wallet = useWallet();
  const router = useRouter();
  const needsOnboarding = wallet.status === "ready" && !wallet.handle;

  useEffect(() => {
    if (wallet.status === "signed-out") router.replace("/");
    else if (needsOnboarding) router.replace("/onboarding");
  }, [wallet.status, needsOnboarding, router]);

  if (wallet.status !== "ready" || !wallet.handle) return null;
  return <>{children(wallet.account, wallet.handle)}</>;
}
