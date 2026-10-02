"use client";

import { MiniAppHost } from "@/components/MiniAppHost";
import { RequireAccount } from "@/components/RequireAccount";
import { Grid } from "@/components/icons";
import { EmptyState, LinkButton, Screen, ScreenSkeleton } from "@/components/ui";
import { useMiniApp } from "@/lib/miniapp/use-miniapps";

export function MiniAppScreen({ id }: { id: string }) {
  const lookup = useMiniApp(id);

  if (lookup.status === "loading") return <ScreenSkeleton />;
  if (lookup.status !== "ready") {
    const failed = lookup.status === "failed";
    return (
      <Screen back="/apps">
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<Grid className="h-6 w-6" />}
            title={failed ? "Couldn't load this app" : "This app isn't available"}
            body={
              failed
                ? "Check your connection and try again."
                : "It may have been switched off, or the link may be out of date."
            }
            action={
              <LinkButton href="/apps" size="md" variant="secondary">
                Back to apps
              </LinkButton>
            }
          />
        </div>
      </Screen>
    );
  }

  const { app } = lookup;
  return <RequireAccount>{(account) => <MiniAppHost app={app} account={account} />}</RequireAccount>;
}
