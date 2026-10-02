# Quick start

Build a page that reads the CrackPay user's balance and sends a payment.

## Prerequisites

- Node.js 18 or newer
- A CrackPay account at `https://crackpay.vercel.app`, with a little testnet
  USDC from `https://faucet.circle.com` (choose Arc Testnet)

## 1. Add the SDK

Put this tag in your page's `<head>`, before your own scripts:

```html
<script src="https://crackpay.vercel.app/miniapp-sdk.js"></script>
```

It defines `window.crackpay.ready`, a promise that resolves with an
[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) provider when your page is
running inside CrackPay, and with `null` in an ordinary browser tab.

## 2. Use the wallet

With [viem](https://viem.sh):

```ts
import { createPublicClient, createWalletClient, custom, erc20Abi, http, parseUnits } from "viem";
import { arcTestnet } from "viem/chains";

const USDC = "0x3600000000000000000000000000000000000000";

const provider = await window.crackpay.ready;
if (!provider) throw new Error("Open this app in CrackPay.");

const wallet = createWalletClient({ chain: arcTestnet, transport: custom(provider) });
const reader = createPublicClient({ chain: arcTestnet, transport: http() });

// Already connected: this returns the user's account without a prompt.
const [account] = await wallet.requestAddresses();

// USDC has 6 decimals through its ERC-20 interface.
const balance = await reader.readContract({
  address: USDC,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account],
});

// CrackPay shows the user a confirmation, signs with their passkey and sends it.
// The promise resolves once the transaction is final.
const hash = await wallet.writeContract({
  account,
  address: "0xYourContract",
  abi: yourAbi,
  functionName: "pay",
  args: [parseUnits("1.50", 6)],
});
```

For TypeScript, declare the global once:

```ts
import type { EIP1193Provider } from "viem";

declare global {
  interface Window {
    crackpay: { version: number; ready: Promise<(EIP1193Provider & { isCrackPay: true }) | null> };
  }
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
