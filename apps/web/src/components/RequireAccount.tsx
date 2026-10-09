"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { currentPath, withNext } from "@/lib/routing";
import type { CrackPaySmartAccount } from "@/lib/wallet";
import { ScreenSkeleton } from "./ui";
import { useWallet } from "./WalletProvider";

/**
 * Where a visitor has to go instead of this screen, or null when they may stay.
 * Anyone signed out goes to sign in. Someone holding a passkey who never chose
 * a handle goes back to onboarding. Someone whose handle is chosen but not yet
 * registered (they could not pay the fee to register it) may stay on screens
 * that work without one, and is sent home from the rest, where they can claim it.
 */
function useGate(allowPendingHandle: boolean): string | null {
  const wallet = useWallet();
  if (wallet.status === "loading") return null;
  if (wallet.status === "signed-out") return "/signin";
  if (wallet.handle) return null;
  if (!wallet.pendingHandle) return "/onboarding";
  return allowPendingHandle ? null : "/";
}

function Gate({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to === "/" ? to : withNext(to, currentPath(window.location)));
  }, [to, router]);
  return <ScreenSkeleton />;
}

/**
 * Renders `children` for a signed-in, registered user. Anyone else is sent on
 * (see `useGate`). The route they were turned away from travels with them as
 * `next`, so a payment link opened cold still ends up on the right screen once
 * they are set up. While we work out which of those is true, a skeleton holds
 * the screen — a blank page here reads as a broken app.
 */
export function RequireAccount({ children }: { children: (account: CrackPaySmartAccount, handle: string) => ReactNode }) {
  const wallet = useWallet();
  const to = useGate(false);
  if (to) return <Gate to={to} />;
  if (wallet.status !== "ready" || !wallet.handle) return <ScreenSkeleton />;
  return <>{children(wallet.account, wallet.handle)}</>;
}

/**
 * Like `RequireAccount`, but also lets in an account whose handle is not
 * registered yet, with `handle` null. For screens that work without one:
 * getting paid, sending, history, Mini Apps.
 */
export function RequireSignedIn({
  children,
}: {
  children: (account: CrackPaySmartAccount, handle: string | null) => ReactNode;
}) {
  const wallet = useWallet();
  const to = useGate(true);
  if (to) return <Gate to={to} />;
  if (wallet.status !== "ready") return <ScreenSkeleton />;
  return <>{children(wallet.account, wallet.handle)}</>;
}
