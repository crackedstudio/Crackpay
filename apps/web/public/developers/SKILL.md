---
name: build-crackpay-miniapp
description: Build, adapt and test Mini Apps for CrackPay, the USD stablecoin wallet on Arc (Circle's L1 where USDC is the gas token). Use when the user wants to create a CrackPay Mini App, port a MiniPay or other dApp to run inside CrackPay, detect or connect the CrackPay wallet, send transactions or read USDC balances from inside CrackPay, test with CrackPay Developer mode, or prepare a Mini App listing. Triggers on CrackPay, CrackPay Mini App, @crackpay/miniapp-sdk, getCrackPayProvider, connectCrackPay, useCrackPay, miniapp-sdk.js, window.crackpay, isCrackPay, Arc Mini App, port from MiniPay.
---

# Build a CrackPay Mini App

A CrackPay Mini App is a normal web app, hosted by its developer, that CrackPay
loads in a frame and connects to the user's wallet. This skill covers building
one, testing it, and getting it listed.

Human-readable docs with the same content live next to this file:
`overview.md`, `quick-start.md`, `test-in-crackpay.md`, `wallet-connection.md`,
`transactions.md`, `reference.md`, `ui-and-container.md`, `listing.md`, all
under `https://crackpay.vercel.app/developers/`.

## Facts to work from

| | |
|---|---|
| CrackPay host | `https://crackpay.vercel.app` |
| SDK (npm) | `@crackpay/miniapp-sdk`, entry points `.`, `/viem`, `/react` |
| SDK (script tag, no bundler) | `https://crackpay.vercel.app/miniapp-sdk.js`, then `await window.crackpay.ready` |
| Chain | Arc Testnet, ID `5042002` (`0x4cef52`), `arcTestnet` in `viem/chains` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://explorer.testnet.arc.io` |
| USDC, ERC-20 interface, 6 decimals | `0x3600000000000000000000000000000000000000` |
| EURC, 6 decimals | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

Do not invent other addresses or chain IDs. CrackPay runs on Arc Testnet today;
Arc Mainnet support is planned for both Developer mode and listings. If the user
needs mainnet now, say it is not available yet.

## Rules

These are not style preferences. Breaking one makes the app fail inside
CrackPay or fail review.

1. **Await the provider.** `getCrackPayProvider()` (or `connectCrackPay()`,
   `useCrackPay()`) resolves with an EIP-1193 provider inside CrackPay and with
   `null` elsewhere. The provider is not available synchronously at page load,
   because the app runs in a frame. Never read `window.ethereum` directly at load.
2. **Auto-connect. No connect button.** `eth_requestAccounts` never prompts.
3. **No message signing.** `personal_sign`, `eth_sign` and
   `eth_signTypedData*` return error `4200`. Never use a signature for login,
   permits or off-chain orders. The account address identifies the user.
4. **No gas handling.** Gas is sponsored. Do not estimate fees, set gas fields,
   reserve a gas balance or ask the user to hold a gas token.
5. **Get the decimals right.** USDC is 18 decimals as a native `value` and 6
   decimals through the ERC-20 interface. They are one balance; never show both
   and never add them. Use `parseUnits(x, 6)` for token amounts and
   `parseEther(x)` only for a native `value`.
6. **One call per transaction.** No batching and no `wallet_sendCalls`.
7. **Token calls are approve-only.** A listed app may call a token contract only
   to `approve` one of its own listed contracts. Never call `transfer` or
   `transferFrom` on a token directly; move tokens through the app's contract.
   Prefer a `payable` function taking native USDC, which needs no approval.
8. **Accounts are smart accounts.** Contracts must not check
   `tx.origin == msg.sender` or reject callers that have code. A new account has
   no code until its first transaction.
9. **Allow framing.** No `X-Frame-Options`. If `frame-ancestors` is set, it
   must include `https://crackpay.vercel.app`.
10. **Phone layout.** Single column, usable at 360 px wide, at most 420 px.
11. **Arc only.** Requests for other chains are refused.

## Workflow

### 1. Set up

For a new app, scaffold with Vite or Next.js. For an existing dApp or a MiniPay
app, keep its stack and change only the wallet layer.

```bash
npm install @crackpay/miniapp-sdk viem
```

`viem` and `react` are optional peers of the package: `viem` is needed for
`@crackpay/miniapp-sdk/viem`, `react` for `@crackpay/miniapp-sdk/react`. The
package is ESM, ships its own types, and is safe to import during server
rendering (everything resolves to `null` without a browser).

Only for a page with no bundler, use the script tag instead:
`<script src="https://crackpay.vercel.app/miniapp-sdk.js"></script>` and
`await window.crackpay.ready` in place of `getCrackPayProvider()`.

### 2. Connect

With viem (preferred):

```ts
import { connectCrackPay } from "@crackpay/miniapp-sdk/viem";

const crackpay = await connectCrackPay();
if (!crackpay) {
  // Not inside CrackPay: show "Open this app in CrackPay".
} else {
  const { account, walletClient, publicClient, provider } = crackpay;
}
```

In React:

```tsx
import { useCrackPay } from "@crackpay/miniapp-sdk/react";

function App() {
  const crackpay = useCrackPay();
  if (crackpay.status === "connecting") return <Loading />;
  if (crackpay.status === "unavailable") return <p>Open this app from CrackPay.</p>;
  if (crackpay.status === "error") return <p>Something went wrong.</p>;
  return <Main account={crackpay.account} provider={crackpay.provider} />;
}
```

`useCrackPay` takes the same options as `getCrackPayProvider`; pass a stable
object (module-level or memoised) or nothing.

The raw provider, for any other library:

```ts
import { getCrackPayProvider } from "@crackpay/miniapp-sdk";

const provider = await getCrackPayProvider();
const [account] = await provider.request({ method: "eth_requestAccounts" });
```

wagmi: build the config after the provider resolves, with CrackPay as the only
connector, and connect once on mount.

```ts
import { getCrackPayProvider } from "@crackpay/miniapp-sdk";
import { createConfig, http, injected } from "wagmi";
import { arcTestnet } from "wagmi/chains";

export async function createCrackPayConfig() {
  const provider = await getCrackPayProvider();
  if (!provider) return null;
  return createConfig({
    chains: [arcTestnet],
    connectors: [injected({ target: { id: "crackpay", name: "CrackPay", provider }, shimDisconnect: false })],
    transports: { [arcTestnet.id]: http() },
  });
}
```

```tsx
function useAutoConnect() {
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

If the app must also work outside CrackPay, treat `null` as "use the normal
wallet flow". CrackPay is also announced through EIP-6963 (`rdns: "app.crackpay"`).

To test against a CrackPay running locally, pass
`{ hostOrigins: ["http://localhost:3000"] }`. The default is
`https://crackpay.vercel.app`.

### 3. Read balances

```ts
import { tokens } from "@crackpay/miniapp-sdk";
import { erc20Abi, formatUnits } from "viem";

const raw = await publicClient.readContract({
  address: tokens.USDC.address,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account],
});
const dollars = formatUnits(raw, tokens.USDC.decimals);
```

### 4. Send transactions

```ts
const hash = await walletClient.writeContract({
  account,
  chain: walletClient.chain,
  address: CONTRACT,
  abi,
  functionName: "pay",
  args: [orderId],
  value: parseEther("1.50"), // native USDC, 18 decimals
});
```

The promise resolves when the transaction is final. A revert rejects the
promise; it does not return a hash. Do not poll for confirmations and do not
add a pending state beyond the awaited call.

For an ERC-20 flow, send `approve(listedContract, amount)` first, await it,
then send the call. The user confirms each one.

The receipt for the returned hash has a bundler as `from` and the ERC-4337
EntryPoint as `to`. Read the app's events from `logs`.

### 5. Handle errors by code

```ts
import { ErrorCode, errorCode, isUserRejection } from "@crackpay/miniapp-sdk";

function messageFor(error: unknown): string {
  if (isUserRejection(error)) return "Cancelled.";
  if (errorCode(error) === ErrorCode.Unauthorized) console.error("Contract is not in this app's listing");
  return "The payment didn't go through. Please try again.";
}
```

`errorCode` reads the code whether the error came from the provider or was
wrapped by viem or wagmi.

| Code | Meaning |
|---|---|
| `4001` | User cancelled the confirmation or passkey prompt |
| `4100` | Not allowed for this app (contract not in the listing, or a forbidden token call) |
| `4200` | Method not supported |
| `4902` | Tried to switch away from Arc |
| `-32602` | Malformed request |
| `-32603` | Reverted, never confirmed, or an internal failure |

Log the original error. If a `-32603` message says the operation was submitted
but never confirmed, tell the user to check their balance before retrying and
never retry automatically.

### 6. Test in CrackPay

Tell the user to do this; it needs their passkey.

1. Make the app reachable at a public HTTPS address: a deployment (Vercel and
   similar), the user's own domain, or a tunnel to the dev server
   (`ngrok http <port>`; with Vite, add the tunnel host to `server.allowedHosts`).
   A plain `http://` address will not load, except `http://localhost` on the same
   computer. A local-network address works only if the dev server serves HTTPS.
2. In CrackPay: Settings → tap **Version** seven times → **Developer settings**
   → switch on **Developer mode**.
3. Paste the HTTPS URL under **Load test page** and tap **Load**.

A test app may call any contract and every prompt is marked "not reviewed". The
user needs testnet USDC from `https://faucet.circle.com` (Arc Testnet).

### 7. Prepare the listing

CrackPay lists an app by recording its URL and the contracts it may call.
Produce a `crackpay-listing.json`. The user submits it, with their email, at
`https://crackpay.vercel.app/developers/submit`:

```json
{
  "name": "",
  "tagline": "",
  "publisher": "",
  "category": "finance",
  "url": "https://",
  "icon": "https://…/icon-512.png",
  "supportUrl": "",
  "termsUrl": "",
  "privacyUrl": "",
  "network": "arc-testnet",
  "contracts": [
    { "address": "0x", "name": "", "purpose": "", "explorerUrl": "", "sampleTransactions": [] }
  ],
  "tokenApprovals": [],
  "origins": []
}
```

List every contract the app sends transactions to: after listing, anything
else is refused with `4100`. Contracts must be verified on the Arc explorer.
`network` is `arc-testnet` or `arc-mainnet`; `category` is one of finance,
shopping, utility, games, social, rewards, education, entertainment; every link
must be `https://` (`supportUrl` may be `mailto:`).

## Porting from MiniPay

| MiniPay | CrackPay |
|---|---|
| `window.ethereum` present at load | `await getCrackPayProvider()` from `@crackpay/miniapp-sdk`; `window.ethereum` is set after it resolves |
| `window.ethereum.isMiniPay` | `provider.isCrackPay` |
| Celo, chain `42220` / `11142220` | Arc Testnet, chain `5042002` |
| `feeCurrency` on transactions | Remove it. Gas is sponsored. |
| USDm, USDC, USDT | USDC (and EURC) |
| `minipay_*` custom methods | Not available. Remove or feature-detect. |
| Phone-number lookup | Not available |
| `eth_signTypedData`, `personal_sign` | Not available. Redesign without signatures. |
| Runs in a WebView | Runs in a frame: allow framing, expect partitioned storage |

Keep: auto-connect, no connect button, mobile layout, error handling by code.

## Checklist before saying it is done

- [ ] `@crackpay/miniapp-sdk` is installed and all wallet code awaits its provider
- [ ] A clear message when the provider is `null`
- [ ] No connect button, no signature request anywhere
- [ ] No gas estimation, fee fields or gas reserve
- [ ] Token amounts use 6 decimals; native `value` uses 18
- [ ] No direct token `transfer` or `transferFrom`
- [ ] Errors handled by `code`, with `4001` treated as a cancel
- [ ] Server allows framing by `https://crackpay.vercel.app`
- [ ] Usable at 360 px wide
- [ ] Every contract the app calls is in `crackpay-listing.json`

## Not available yet

Do not build on these: message or typed-data signing, batched calls, QR
scanning, contact picker, exchange-rate method, phone lookup, deep links from
outside CrackPay, mainnet.
