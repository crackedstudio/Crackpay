"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { MiniAppHost } from "@/components/MiniAppHost";
import { RequireAccount } from "@/components/RequireAccount";
import { Screen } from "@/components/ui";
import { testMiniApp } from "@/config/miniapps";
import { developer } from "@/lib/developer";
import type { CrackPaySmartAccount } from "@/lib/wallet";

const subscribe = () => () => {};

function TestApp({ account }: { account: CrackPaySmartAccount }) {
  const url = useSearchParams().get("url") ?? "";
  // False on the server and during hydration, then the stored setting.
  const enabled = useSyncExternalStore(subscribe, developer.isEnabled, () => false);
  const app = testMiniApp(url);

  if (!enabled) {
    return (
      <Screen title="Developer mode is off" back="/settings">
        <p className="text-muted">Test apps can only be loaded with Developer mode switched on.</p>
        <Link href="/settings/developer" className="text-accent">
          Open Developer settings
        </Link>
      </Screen>
    );
  }
  if (!app) {
    return (
      <Screen title="Can't load that URL" back="/settings/developer">
        <p className="text-muted">A test app must be an HTTPS URL, or http://localhost while you develop.</p>
      </Screen>
    );
  }
  return <MiniAppHost app={app} account={account} />;
}

export default function TestAppPage() {
  return (
    <RequireAccount>
      {(account) => (
        // useSearchParams needs a Suspense boundary to prerender.
        <Suspense>
          <TestApp account={account} />
        </Suspense>
      )}
    </RequireAccount>
  );
}
