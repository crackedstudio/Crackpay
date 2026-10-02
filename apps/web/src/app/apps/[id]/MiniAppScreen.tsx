"use client";

import { MiniAppHost } from "@/components/MiniAppHost";
import { RequireAccount } from "@/components/RequireAccount";
import { findMiniApp } from "@/config/miniapps";

export function MiniAppScreen({ id }: { id: string }) {
  const app = findMiniApp(id);
  if (!app) return <p className="p-4 text-sm">This app is not available.</p>;
  return <RequireAccount>{(account) => <MiniAppHost app={app} account={account} />}</RequireAccount>;
}
