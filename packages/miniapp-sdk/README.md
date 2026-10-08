# @crackpay/miniapp-sdk

Build Mini Apps that run inside [CrackPay](https://crackpay.vercel.app), the USD
stablecoin wallet on Arc.

A Mini App is your own web app, opened inside CrackPay. This package connects it
to the CrackPay user's wallet: no connect button, no gas, and every payment is
confirmed by the user with their passkey.

Full documentation: <https://crackpay.vercel.app/developers>

## Install

```bash
npm install @crackpay/miniapp-sdk
```

`viem` and `react` are optional peers, needed only for the `/viem` and `/react`
entry points.

## Connect

```ts
import { getCrackPayProvider } from "@crackpay/miniapp-sdk";

const provider = await getCrackPayProvider();
if (!provider) {
  // Not inside CrackPay. Ask the user to open your app from CrackPay.
}

const [account] = await provider.request({ method: "eth_requestAccounts" });
```

`getCrackPayProvider()` resolves with a standard EIP-1193 provider inside
CrackPay and with `null` anywhere else. It never prompts.

## With viem

```ts
import { connectCrackPay } from "@crackpay/miniapp-sdk/viem";
import { getTokens } from "@crackpay/miniapp-sdk";
import { erc20Abi, formatUnits, parseEther } from "viem";

const crackpay = await connectCrackPay();
if (!crackpay) throw new Error("Open this app in CrackPay.");
const { account, handle, chain, walletClient, publicClient } = crackpay;
console.log(handle ? `Hi @${handle}` : "Hi there", "on", chain.name);

// Mainnet and testnet use different token addresses; look them up per chain.
const tokens = getTokens(chain.id)!;

const balance = await publicClient.readContract({
  address: tokens.USDC.address,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account],
});
console.log(formatUnits(balance, tokens.USDC.decimals), "USDC");

// The user confirms in CrackPay. Resolves once the transaction is final.
const hash = await walletClient.writeContract({
  account,
  chain: walletClient.chain,
  address: "0xYourContract",
  abi: yourAbi,
  functionName: "pay",
  value: parseEther("1.50"), // native USDC uses 18 decimals as a transaction value
});
```

## With React

```tsx
import { useCrackPay } from "@crackpay/miniapp-sdk/react";

function App() {
  const crackpay = useCrackPay();

  if (crackpay.status === "connecting") return <p>Loading…</p>;
  if (crackpay.status === "unavailable") return <p>Open this app from CrackPay.</p>;
  if (crackpay.status === "error") return <p>Something went wrong.</p>;
  return <p>Hi {crackpay.handle ? `@${crackpay.handle}` : crackpay.account}</p>;
}
```

## Handling errors

```ts
import { ErrorCode, errorCode, isUserRejection } from "@crackpay/miniapp-sdk";

try {
  await walletClient.writeContract(/* … */);
} catch (error) {
  if (isUserRejection(error)) return show("Cancelled.");
  if (errorCode(error) === ErrorCode.Unauthorized) console.error("Contract is not in this app's listing");
  show("The payment didn't go through. Please try again.");
}
```

## Mainnet and testnet

CrackPay runs on Arc mainnet (chain `5042`, real USDC) and on Arc Testnet
(chain `5042002`, test USDC). Each CrackPay is on one network, and your app runs
on whichever opened it. Never hardcode the chain:

- `connectCrackPay()` returns `chain` and builds its viem clients for it.
- With the bare provider, call `eth_chainId` and pass it to `getArcChain()`.
- `getTokens(chainId)` gives that network's USDC and EURC. The old `tokens`
  export is testnet only.
- Your contracts must be deployed, and listed, on each network you support.

## What to know before you build

- **Connect on load.** Never show a "Connect wallet" button.
- **No message signing.** `personal_sign` and `eth_signTypedData` are not
  available. The account address is your user's identity.
- **No gas.** CrackPay sponsors it. Do not estimate fees or set gas fields.
- **USDC has two scales.** 6 decimals through its token contract, 18 as a
  transaction `value`. They are the same balance.
- **One call per transaction.**
- **Your server must allow framing** by `https://crackpay.xyz` (mainnet) and
  `https://crackpay.vercel.app` (testnet).

## Testing

Load your app in CrackPay through Developer mode: Settings → tap Version seven
times → Developer settings → Developer mode → Load test page. See
[Test in CrackPay](https://crackpay.vercel.app/developers/test-in-crackpay.md).

To test against a CrackPay you run locally, pass its address:

```ts
getCrackPayProvider({ hostOrigins: ["http://localhost:3000"] });
```

## Without a bundler

```html
<script src="https://crackpay.vercel.app/miniapp-sdk.js"></script>
<script>
  window.crackpay.ready.then((provider) => { /* same provider, or null */ });
</script>
```

## License

MIT
