---
name: use-crackpay-sdk
description: Use the @crackpay/miniapp-sdk npm package to connect a web app to the CrackPay wallet. Covers installing it, getCrackPayProvider, connectCrackPay (viem), useCrackPay (React), wagmi setup, the script-tag build, detecting CrackPay, server rendering, and the smart-account caveats. Use when writing or fixing wallet connection code for a CrackPay Mini App, or when the user mentions @crackpay/miniapp-sdk, getCrackPayProvider, connectCrackPay, useCrackPay, isCrackPay, window.crackpay or miniapp-sdk.js.
---

# Use the CrackPay SDK

`@crackpay/miniapp-sdk` gives a Mini App the CrackPay user's wallet as a standard
EIP-1193 provider. Full export list: `references/api.md`.

```bash
npm install @crackpay/miniapp-sdk viem
```

`viem` and `react` are optional peers: `viem` for `/viem`, `react` for `/react`.
The package is ESM with its own types.

## The one thing to get right

The provider is **asynchronous**. A Mini App runs in a frame, and the provider
appears after a short handshake with the CrackPay page. Every entry point returns
a promise or a status; none of them is ready synchronously at page load.

- Never read `window.ethereum` at load and assume it is there.
- Never render a "Connect wallet" button. Await the provider and proceed.
- `null` means "not inside CrackPay". Show a message; do not treat it as an error.

## Connect

### viem (preferred)

```ts
import { connectCrackPay } from "@crackpay/miniapp-sdk/viem";

const crackpay = await connectCrackPay();
if (!crackpay) {
  showMessage("Open this app from CrackPay to use it.");
} else {
  const { account, walletClient, publicClient, provider } = crackpay;
}
```

`account` is the user's address and `handle` their CrackPay handle (without the
"@", or `null`). `walletClient` sends through CrackPay. `publicClient` reads from
Arc directly. Nothing here prompts the user.

### React

```tsx
import { useCrackPay } from "@crackpay/miniapp-sdk/react";

function App() {
  const crackpay = useCrackPay();

  if (crackpay.status === "connecting") return <Loading />;
  if (crackpay.status === "unavailable") return <p>Open this app from CrackPay.</p>;
  if (crackpay.status === "error") return <p>Something went wrong.</p>;
  return <Main account={crackpay.account} handle={crackpay.handle} provider={crackpay.provider} />;
}
```

Call it once near the root and pass `account` and `provider` down. If it takes
options, pass a stable object (module-level or memoised): a new object each
render reconnects each render.

### Any other library

```ts
import { getCrackPayProvider } from "@crackpay/miniapp-sdk";

const provider = await getCrackPayProvider();
if (provider) {
  const [account] = await provider.request({ method: "eth_requestAccounts" });
}
```

Safe to call from many places; the connection is made once and remembered.

### wagmi

See `references/wagmi.md`. In short: build the config after the provider
resolves, with CrackPay as the only connector, and connect once on mount.

### No bundler

```html
<script src="https://crackpay.vercel.app/miniapp-sdk.js"></script>
<script type="module">
  const provider = await window.crackpay.ready; // same provider, or null
</script>
```

Use this only for a page with no build step. Otherwise install the package.

## The user's handle

Every CrackPay user picks a handle, like `@sam`. The SDK gives it to the app with
no prompt: `handle` from `connectCrackPay()` and `useCrackPay()`, or
`getCrackPayUser(provider)` for the raw provider.

- Use it to greet the user and to show who is paying ("Paid by @sam").
- It is public: anyone can look it up from the account on-chain. Showing it is fine.
- Identify the user by `account`, not by handle. Store the account in your database.
- It can be `null`; fall back to a short account address.
- It needs `@crackpay/miniapp-sdk` 0.2.0 or later.

## After connecting

- `provider.isCrackPay` is `true`.
- `window.ethereum` is the same provider, unless something else set it first.
- It is announced through EIP-6963 as `CrackPay` (`rdns: "app.crackpay"`).
- `eth_requestAccounts` and `eth_accounts` return one account and never prompt.
- The account does not change during a session.

## Apps that also run outside CrackPay

Treat `null` as "use the normal wallet flow":

```ts
const crackpay = await connectCrackPay();
const wallet = crackpay ?? (await connectWithYourUsualWalletFlow());
```

`isFramed()` answers synchronously whether the page is in a frame at all, which
helps decide what to render while the promise is pending. Not framed means
certainly not in CrackPay; framed means "wait and see".

## Server rendering

The package is safe to import on a server: with no `window`, everything resolves
to `null`. In Next.js put wallet code in a Client Component (`"use client"`) and
call `connectCrackPay` in an effect or use `useCrackPay`.

## Which CrackPay to trust

The package trusts `https://crackpay.vercel.app`. To test against a CrackPay the
user runs locally, name it:

```ts
getCrackPayProvider({ hostOrigins: ["http://localhost:3000"] });
```

Never widen `hostOrigins` to a site the user does not control: whichever page is
on that list is trusted as the wallet.

## The account is a smart account

A CrackPay account is a passkey-controlled smart contract account, not a
private-key wallet.

- **Signing is unavailable.** `personal_sign`, `eth_sign` and
  `eth_signTypedData*` reject with code `4200`. Do not build login, permits or
  off-chain orders on signatures. The account address is the user's identity.
- **`msg.sender` is the user's account.** `tx.origin` is a bundler, so a contract
  that requires `tx.origin == msg.sender`, or rejects callers that have code,
  rejects CrackPay users.
- **A new account has no code** until its first transaction. Do not use
  `eth_getCode` to decide whether an address is a user.

## Next

Sending transactions, reading balances and handling errors:
**`send-crackpay-transactions`**.
