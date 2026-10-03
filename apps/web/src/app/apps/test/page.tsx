"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { MiniAppHost } from "@/components/MiniAppHost";
import { RequireAccount } from "@/components/RequireAccount";
import { Screen } from "@/components/ui";
import { testMiniApp, testUrlProblem } from "@/config/miniapps";
import { developer } from "@/lib/developer";
import type { CrackPaySmartAccount } from "@/lib/wallet";

const subscribe = () => () => {};

function TestApp({ account, handle }: { account: CrackPaySmartAccount; handle: string }) {
  const url = useSearchParams().get("url") ?? "";
  // False on the server and during hydration, then the stored setting.
  const enabled = useSyncExternalStore(subscribe, developer.isEnabled, () => false);
  const app = testMiniApp(url);

  if (!enabled) {
    return (
      <Screen title="Developer mode is off" back="/settings">
        <p className="text-muted">Test apps can only be loaded with Developer mode switched on.</p>
        <Link href="/settings/developer" className="text-money">
          Open Developer settings
        </Link>
      </Screen>
    );
  }
  if (!app) {
    return (
      <Screen title="Can't load that URL" back="/settings/developer">
        <p className="text-muted">{testUrlProblem(url)}</p>
      </Screen>
    );
  }
  return <MiniAppHost app={app} account={account} handle={handle} />;
}

export default function TestAppPage() {
  return (
    <RequireAccount>
      {(account, handle) => (
        // useSearchParams needs a Suspense boundary to prerender.
        <Suspense>
          <TestApp account={account} handle={handle} />
        </Suspense>
      )}
    </RequireAccount>
  );
}
