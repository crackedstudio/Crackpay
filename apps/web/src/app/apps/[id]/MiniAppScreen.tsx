"use client";

import { MiniAppHost } from "@/components/MiniAppHost";
import { WalletGate } from "@/components/WalletGate";
import { findMiniApp } from "@/config/miniapps";

export function MiniAppScreen({ id }: { id: string }) {
  const app = findMiniApp(id);
  if (!app) return <p className="p-4 text-sm">This app is not available.</p>;
  return <WalletGate>{(account) => <MiniAppHost app={app} account={account} />}</WalletGate>;
}
