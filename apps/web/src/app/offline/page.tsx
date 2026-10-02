import { Wallet } from "@/components/icons";
import { EmptyState, Screen } from "@/components/ui";

export default function Offline() {
  return (
    <Screen>
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="You're offline"
          body="Your money is safe. CrackPay needs a connection to show your balance and send a payment."
        />
      </div>
    </Screen>
  );
}
