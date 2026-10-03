"use client";

import { ActivityList } from "@/components/ActivityList";
import { RequireAccount } from "@/components/RequireAccount";
import { TabBar } from "@/components/TabBar";
import { LinkButton, Screen } from "@/components/ui";

export default function Activity() {
  return (
    <RequireAccount>
      {(account, handle) => (
        <>
          <Screen title="Activity" inset>
            <ActivityList
              account={account.address}
              limit={50}
              grouped
              emptyAction={
                /* A first-timer has nothing to send yet, so the way out of an
                   empty history is to get paid, not to pay. */
                <LinkButton href="/receive" size="md" variant="secondary">
                  Share @{handle}
                </LinkButton>
              }
            />
          </Screen>
          <TabBar />
        </>
      )}
    </RequireAccount>
  );
}
