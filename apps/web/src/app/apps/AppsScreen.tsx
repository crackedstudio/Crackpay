"use client";

import Link from "next/link";
import { RequireAccount } from "@/components/RequireAccount";
import { TabBar } from "@/components/TabBar";
import { ChevronRight, Grid } from "@/components/icons";
import { Card, EmptyState, Screen } from "@/components/ui";
import { miniApps } from "@/config/miniapps";

export function AppsScreen() {
  const apps = miniApps.filter((app) => app.enabled);
  return (
    <RequireAccount>
      {() => (
        <>
          <Screen title="Apps" inset>
            {apps.length === 0 ? (
              <EmptyState
                icon={<Grid className="h-6 w-6" />}
                title="No apps yet"
                body="Apps built on CrackPay will show up here. They spend from your balance, but never see your passkey."
              />
            ) : (
              <>
                <p className="px-1 text-sm text-muted">
                  These run inside CrackPay and ask you before they spend anything.
                </p>
                <div className="flex flex-col gap-3">
                  {apps.map((app) => (
                    <Link key={app.id} href={`/apps/${app.id}`} className="pressable">
                      <Card className="flex items-center gap-3 p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface font-semibold">
                          {app.name.slice(0, 1)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-medium">{app.name}</span>
                          <span className="truncate text-sm text-muted">{app.description}</span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted" />
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Screen>
          <TabBar />
        </>
      )}
    </RequireAccount>
  );
}
