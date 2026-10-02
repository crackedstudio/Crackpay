"use client";

import { ActivityList } from "@/components/ActivityList";
import { RequireAccount } from "@/components/RequireAccount";
import { TabBar } from "@/components/TabBar";
import { LinkButton, Screen } from "@/components/ui";

export default function Activity() {
  return (
    <RequireAccount>
      {(account) => (
        <>
          <Screen title="Activity" inset>
            <ActivityList
              account={account.address}
              limit={50}
              emptyAction={
                <LinkButton href="/send" size="md" variant="secondary">
                  Send your first payment
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
