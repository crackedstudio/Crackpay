"use client";

import { MiniAppList } from "@/components/MiniAppList";
import { RequireSignedIn } from "@/components/RequireAccount";
import { TabBar } from "@/components/TabBar";
import { Grid } from "@/components/icons";
import { EmptyState, Screen, Skeleton } from "@/components/ui";
import { useMiniApps } from "@/lib/miniapp/use-miniapps";

export function AppsScreen() {
  const { apps, failed } = useMiniApps();
  return (
    <RequireSignedIn>
      {() => (
        <>
          <Screen title="Apps" inset>
            {failed ? (
              <EmptyState
                icon={<Grid className="h-6 w-6" />}
                title="Couldn't load apps"
                body="Check your connection and try again."
              />
            ) : apps === null ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-[84px] rounded-3xl" />
                <Skeleton className="h-[84px] rounded-3xl" />
              </div>
            ) : apps.length === 0 ? (
              <EmptyState
                icon={<Grid className="h-6 w-6" />}
                title="No apps yet"
                body="Apps built on CrackPay will show up here. They spend from your balance, but never see your passkey."
              />
            ) : (
              <MiniAppList apps={apps} />
            )}
          </Screen>
          <TabBar />
        </>
      )}
    </RequireSignedIn>
  );
}
