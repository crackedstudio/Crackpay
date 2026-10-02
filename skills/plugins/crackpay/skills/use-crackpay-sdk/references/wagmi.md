# CrackPay with wagmi

There is no CrackPay connector package. Use wagmi's `injected` connector with the
CrackPay provider as its target. Because the provider is asynchronous, create the
wagmi config after it resolves.

```ts
// crackpay-config.ts
import { getCrackPayProvider } from "@crackpay/miniapp-sdk";
import { createConfig, http, injected } from "wagmi";
import { arcTestnet } from "wagmi/chains";

export async function createCrackPayConfig() {
  const provider = await getCrackPayProvider();
  if (!provider) return null; // not inside CrackPay

  return createConfig({
    chains: [arcTestnet],
    connectors: [
      injected({
        target: { id: "crackpay", name: "CrackPay", provider },
        // CrackPay has no permissions API; skip wagmi's disconnect shim.
        shimDisconnect: false,
      }),
    ],
    transports: { [arcTestnet.id]: http() },
  });
}
```

```tsx
// main.tsx
const config = await createCrackPayConfig();

createRoot(root).render(
  config ? (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  ) : (
    <p>Open this app from CrackPay.</p>
  ),
);
```

```tsx
// Connect once on mount. Never render a connect button.
import { useEffect, useRef } from "react";
import { useConnect, useConnectors } from "wagmi";

export function useAutoConnect() {
  const connectors = useConnectors();
  const { connect } = useConnect();
  const attempted = useRef(false);

  useEffect(() => {
    const connector = connectors[0];
    if (attempted.current || !connector) return;
    attempted.current = true;
    connect({ connector });
  }, [connectors, connect]);
}
```

## What to avoid in wagmi

- `useSignMessage`, `useSignTypedData`: signing is unavailable (error 4200).
- `useSendCalls`, `useWriteContracts`: batching is unavailable.
- `useSwitchChain` to anything but Arc.
- Gas options on `useSendTransaction` and `useWriteContract`: ignored.

`useAccount`, `useReadContract`, `useBalance`, `useWriteContract`,
`useSendTransaction` and `useWaitForTransactionReceipt` all work.
`useBalance` returns the native balance at 18 decimals; read USDC's ERC-20
`balanceOf` for a 6-decimal figure instead.

## Errors

wagmi wraps provider errors. Use `errorCode(error)` and `isUserRejection(error)`
from `@crackpay/miniapp-sdk`, which look through the wrapping.
