"use client";

import { ActivityList } from "@/components/ActivityList";
import { RequireAccount } from "@/components/RequireAccount";
import { Screen } from "@/components/ui";

export default function Activity() {
  return (
    <RequireAccount>
      {(account) => (
        <Screen title="Activity" back="/">
          <ActivityList account={account.address} limit={50} />
        </Screen>
      )}
    </RequireAccount>
  );
}
