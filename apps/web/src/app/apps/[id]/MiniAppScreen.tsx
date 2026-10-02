"use client";

import { MiniAppHost } from "@/components/MiniAppHost";
import { RequireAccount } from "@/components/RequireAccount";
import { Grid } from "@/components/icons";
import { EmptyState, LinkButton, Screen } from "@/components/ui";
import { findMiniApp } from "@/config/miniapps";

export function MiniAppScreen({ id }: { id: string }) {
  const app = findMiniApp(id);

  if (!app) {
    return (
      <Screen back="/apps">
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<Grid className="h-6 w-6" />}
            title="This app isn't available"
            body="It may have been switched off, or the link may be out of date."
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

  return <RequireAccount>{(account) => <MiniAppHost app={app} account={account} />}</RequireAccount>;
}
