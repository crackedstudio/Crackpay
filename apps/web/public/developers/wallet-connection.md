# Wallet connection

A Mini App is connected from the moment it loads. Never show a connect button,
and never ask the user to sign a message to prove who they are.

## Getting the provider

```html
<script src="https://crackpay.vercel.app/miniapp-sdk.js"></script>
```

```ts
const provider = await window.crackpay.ready;
```

`ready` resolves with the provider inside CrackPay and with `null` anywhere
else, after at most three seconds. Unlike MiniPay, the provider is not present
synchronously at page load: CrackPay Mini Apps run in a frame, and the provider
is set up by a short handshake with the CrackPay page. Always wait for `ready`.

Once it resolves with a provider:

- `provider.isCrackPay` is `true`.
- `window.ethereum` is the same provider, unless something else already set it.
- It is announced through [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)
  as `CrackPay` (`rdns: "app.crackpay"`), so wallet libraries that discover
  providers will find it.

## Handling "not in CrackPay"

```ts
const provider = await window.crackpay.ready;
if (!provider) {
  showMessage("Open this app from CrackPay to use it.");
  return;
}
```

If your app also works as a normal website, use `null` to fall back to your
usual wallet connection.

## Auto-connect

```ts
const [account] = await provider.request({ method: "eth_requestAccounts" });
```

This never prompts. `eth_accounts` returns the same single account. The account
does not change during a session.

## With wagmi

Create the config after `ready`, with CrackPay as the only connector, and
connect on mount:

```tsx
import { createConfig, http, injected, useConnect, useConnectors } from "wagmi";
import { arcTestnet } from "wagmi/chains";
import { useEffect, useRef } from "react";

export async function createCrackPayConfig() {
  const provider = await window.crackpay.ready;
  if (!provider) return null;

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

Render your app only once `createCrackPayConfig()` has resolved. If it returns
`null`, show the "open in CrackPay" message instead.

## The account is a smart account

A CrackPay account is a passkey-controlled smart contract account (ERC-4337),
not a private-key wallet. For your app this means:

- **No message signing.** `personal_sign`, `eth_sign` and `eth_signTypedData_v4`
  return error `4200`. Do not build login, off-chain orders or permits on them.
- **`msg.sender` is the user's account**, as you would expect. `tx.origin` is a
  bundler, so a contract that requires `tx.origin == msg.sender`, or rejects
  callers that have code, will reject CrackPay users.
- **A new account has no code** until its first transaction. Do not use
  `eth_getCode` to decide whether an address is a user.

## Without the hosted script

The script is generated from one dependency-free TypeScript file. If you would
rather bundle it, ask the CrackPay team for `sdk.ts` and call
`installCrackPayProvider({ hostOrigins: ["https://crackpay.vercel.app"] })`.
If you host your own copy of the script, tell it which CrackPay to trust:

```html
<script src="/vendor/miniapp-sdk.js" data-host-origins="https://crackpay.vercel.app"></script>
```
