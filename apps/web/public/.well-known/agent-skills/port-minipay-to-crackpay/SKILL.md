---
name: port-minipay-to-crackpay
description: Port an existing MiniPay Mini App, or another EVM dApp, to run inside CrackPay on Arc. Maps MiniPay concepts to CrackPay (provider detection, chain, fee currency, stablecoins, custom methods, signing), lists what has no equivalent, and gives a step-by-step migration that can keep the app working in both wallets. Use when the user has a MiniPay or Celo Mini App, mentions isMiniPay, feeCurrency, USDm or minipay_ methods, or wants one codebase to support both MiniPay and CrackPay.
---

# Port a MiniPay Mini App to CrackPay

The two wallets share a model: the wallet is connected when the page loads, there
is no connect button, and the app is found in a directory inside the wallet. A
MiniPay app's structure carries over. The wallet layer and the chain do not.

## What changes

| | MiniPay | CrackPay |
|---|---|---|
| Container | Native WebView | A frame inside the CrackPay page |
| Provider | `window.ethereum`, present at load | `await getCrackPayProvider()` from `@crackpay/miniapp-sdk`; `window.ethereum` is set after it resolves |
| Detection | `window.ethereum.isMiniPay` | `provider.isCrackPay` |
| Chain | Celo `42220`, Celo Sepolia `11142220` | Arc Testnet `5042002` |
| Gas | Paid in a stablecoin via `feeCurrency` | Sponsored. Nothing to set. |
| Account | Private-key account | Passkey smart account (ERC-4337) |
| Stablecoins | USDm, USDC, USDT | USDC, EURC |
| Native token | CELO | USDC (18 decimals as a `value`) |
| Signing | `personal_sign`, typed data | Not available |
| Custom methods | `minipay_scanQrCode`, `minipay_requestContact`, `minipay_getExchangeRate` | Not available |
| Phone lookup | ODIS / social connect | Not available |
| Testing | Developer settings → Load test page | The same, in CrackPay |
| Listing | Submission form | Listing file submitted for admin review |

## What stays

Auto-connect, no connect button, mobile-first single column, error handling by
code, HTTPS, viem and wagmi.

## Migration

### 1. Find the wallet layer

Search for: `window.ethereum`, `isMiniPay`, `feeCurrency`, `celo`, `celoSepolia`,
`42220`, `11142220`, `signMessage`, `signTypedData`, `minipay_`, and the token
addresses in use.

### 2. Install the SDK

```bash
npm install @crackpay/miniapp-sdk
```

### 3. Replace provider access

```ts
// MiniPay
if (window.ethereum?.isMiniPay) {
  const client = createWalletClient({ chain: celo, transport: custom(window.ethereum) });
}

// CrackPay
import { connectCrackPay } from "@crackpay/miniapp-sdk/viem";

const crackpay = await connectCrackPay();
if (crackpay) {
  const { account, walletClient, publicClient } = crackpay;
}
```

The change that matters is `await`. Code that read `window.ethereum`
synchronously at startup must move behind the promise: delay rendering, or use
`useCrackPay()` in React. See `use-crackpay-sdk`.

### 4. Switch the chain

Replace `celo` / `celoSepolia` with `arcTestnet` from `viem/chains` (or
`wagmi/chains`), in configs, public clients and explorer links. Remove chain
switching: CrackPay offers Arc only.

### 5. Remove fee-currency code

Delete every `feeCurrency` field, fee-currency balance check, CIP-64 transaction
type and gas estimate in a stablecoin. CrackPay sponsors gas; a transaction
needs `to`, `data` and optionally `value`.

### 6. Rework token amounts

- Replace Celo token addresses with Arc's: USDC
  `0x3600000000000000000000000000000000000000`, EURC
  `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`, both 6 decimals (`tokens` in the
  SDK). USDm and USDT have no equivalent; use USDC.
- Check every `parseUnits` and `formatUnits`. Celo's USDm is 18 decimals; Arc's
  USDC is 6 as a token.
- Direct token `transfer` calls are not allowed for a listed app. Either pay a
  contract with native `value`, or route tokens through the app's own contract
  with `approve` then a call. See `send-crackpay-transactions`.

### 7. Remove what has no equivalent

- **Signing.** Replace signature-based login with the account address. Replace
  permits and signed orders with on-chain calls.
- **`minipay_*` methods.** Remove QR scanning, contact picking and exchange
  rates, or feature-detect and hide them.
- **Phone-number lookup.** Remove it; ask for an address instead.

### 8. Redeploy contracts on Arc

Contracts on Celo do not exist on Arc. Deploy to Arc Testnet and check they
accept smart-account callers: no `tx.origin == msg.sender`, no "caller has no
code" checks. `msg.value` is USDC with 18 decimals, not CELO.

### 9. Adapt to the frame

- The server must allow framing by `https://crackpay.vercel.app`: no
  `X-Frame-Options`.
- Storage inside the frame is separate from storage in a normal tab, and
  third-party cookies are usually blocked. Keep sessions in `localStorage` or
  memory, keyed by account address.
- Passkeys and camera access are unavailable inside the frame.
- Links to other sites need `target="_blank"`.

### 10. Test and list

`test-crackpay-miniapp`, then `list-crackpay-miniapp`.

## One codebase for both wallets

Pick the wallet once at startup and hide the differences behind one interface.

```ts
import { connectCrackPay } from "@crackpay/miniapp-sdk/viem";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { arcTestnet, celo } from "viem/chains";

export async function connectWallet() {
  const crackpay = await connectCrackPay();
  if (crackpay) return { wallet: "crackpay" as const, chain: arcTestnet, ...crackpay };

  if (window.ethereum?.isMiniPay) {
    const walletClient = createWalletClient({ chain: celo, transport: custom(window.ethereum) });
    const [account] = await walletClient.requestAddresses();
    return {
      wallet: "minipay" as const,
      chain: celo,
      account,
      walletClient,
      publicClient: createPublicClient({ chain: celo, transport: http() }),
    };
  }
  return null;
}
```

Try CrackPay first: inside MiniPay it resolves to `null` at once, because a
WebView page is not in a frame. Keep per-wallet values (token addresses,
decimals, contract addresses, whether to set `feeCurrency`) in one table keyed
by `wallet`, and branch nowhere else.
