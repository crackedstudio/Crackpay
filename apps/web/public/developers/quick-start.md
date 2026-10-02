# Quick start

Build a page that reads the CrackPay user's balance and sends a payment.

## Prerequisites

- Node.js 18 or newer
- A CrackPay account at `https://crackpay.vercel.app`, with a little testnet
  USDC from `https://faucet.circle.com` (choose Arc Testnet)

## 1. Install the SDK

```bash
npm install @crackpay/miniapp-sdk viem
```

The package is [`@crackpay/miniapp-sdk`](https://www.npmjs.com/package/@crackpay/miniapp-sdk).
No bundler? Use the [script tag](#without-a-bundler) instead.

## 2. Use the wallet

```ts
import { tokens } from "@crackpay/miniapp-sdk";
import { connectCrackPay } from "@crackpay/miniapp-sdk/viem";
import { erc20Abi, formatUnits, parseEther } from "viem";

// Resolves with the wallet inside CrackPay, and with null in an ordinary tab.
// Already connected: this never prompts the user.
const crackpay = await connectCrackPay();
if (!crackpay) throw new Error("Open this app in CrackPay.");
const { account, walletClient, publicClient } = crackpay;

// USDC has 6 decimals through its token contract.
const balance = await publicClient.readContract({
  address: tokens.USDC.address,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account],
});
console.log(formatUnits(balance, tokens.USDC.decimals), "USDC");

// CrackPay shows the user a confirmation, signs with their passkey and sends it.
// The promise resolves once the transaction is final.
const hash = await walletClient.writeContract({
  account,
  chain: walletClient.chain,
  address: "0xYourContract",
  abi: yourAbi,
  functionName: "pay",
  value: parseEther("1.50"), // native USDC uses 18 decimals as a transaction value
});
```

In React, use the hook:

```tsx
import { useCrackPay } from "@crackpay/miniapp-sdk/react";

function App() {
  const crackpay = useCrackPay();

  if (crackpay.status === "connecting") return <p>Loading…</p>;
  if (crackpay.status === "unavailable") return <p>Open this app from CrackPay.</p>;
  if (crackpay.status === "error") return <p>Something went wrong.</p>;
  return <p>Connected as {crackpay.account}</p>;
}
```

## 3. Let CrackPay frame your app

CrackPay loads your app in a frame, so your server must allow it:

- Do not send `X-Frame-Options: DENY` or `SAMEORIGIN`.
- If you send a `Content-Security-Policy` with `frame-ancestors`, include
  `https://crackpay.vercel.app`.

## 4. Test it

Run your app, expose it over HTTPS, and load it through Developer mode. The
steps are in [Test in CrackPay](./test-in-crackpay.md).

## 5. Get listed

When it works, send CrackPay your listing details. See [Get listed](./listing.md).

## Rules that will save you a rejection

- **Never show a "Connect wallet" button.** Connect on load.
- **Never ask the user to sign a message to log in.** Message signing is not
  available; the account address is your user identity.
- **Do not handle gas.** No gas estimate, no fee field, no "reserve for gas".
- **Design for a phone.** Your app gets a column at most 420 px wide.

## Without a bundler

Load the SDK as a script instead of installing it:

```html
<script src="https://crackpay.vercel.app/miniapp-sdk.js"></script>
<script type="module">
  const provider = await window.crackpay.ready; // the same provider, or null
  if (provider) {
    const [account] = await provider.request({ method: "eth_requestAccounts" });
  }
</script>
```

`window.crackpay.ready` is the script-tag equivalent of `getCrackPayProvider()`.
