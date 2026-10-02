---
name: build-crackpay-miniapp
description: Start here to build a Mini App for CrackPay, the USD stablecoin wallet on Arc (Circle's L1 where USDC is the gas token). Scaffolds a working Mini App from a starter template, explains how a Mini App talks to the wallet, and routes to the other CrackPay skills. Use when the user wants to create, scaffold, start or plan a CrackPay Mini App, or asks what a CrackPay Mini App is or how to build on CrackPay. Triggers on CrackPay, CrackPay Mini App, build on CrackPay, Mini App on Arc, crackpay starter, scaffold mini app.
---

# Build a CrackPay Mini App

A CrackPay Mini App is an ordinary web app, hosted by its developer, that
CrackPay opens in a frame and connects to the user's wallet. The app asks;
CrackPay shows the user a confirmation, signs with their passkey and pays the
gas. The app never sees a key.

## Facts

| | |
|---|---|
| CrackPay | `https://crackpay.vercel.app` (Arc Testnet) |
| SDK | `@crackpay/miniapp-sdk` on npm, entry points `.`, `/viem`, `/react` |
| Chain | Arc Testnet, ID `5042002` (`0x4cef52`), `arcTestnet` in `viem/chains` |
| USDC, 6 decimals | `0x3600000000000000000000000000000000000000` |
| EURC, 6 decimals | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| Docs | `https://crackpay.vercel.app/developers` |

Do not invent other addresses or chain IDs. Mainnet is not available yet; if the
user needs it, say so and build on testnet.

## Rules every Mini App follows

Breaking one makes the app fail inside CrackPay or fail review.

1. **Connect on load, never with a button.** The wallet is already connected.
2. **No message signing.** No sign-in signature, permit or off-chain order.
3. **No gas handling.** No estimate, no fee field, no gas reserve.
4. **6 decimals for token amounts, 18 for a native `value`.** One balance.
5. **One call per transaction.** No batching.
6. **Token contracts are approve-only**, and only towards the app's own contract.
7. **Phone layout.** Single column, usable at 360 px, at most 420 px wide.
8. **The server allows framing** by `https://crackpay.vercel.app`.

Details and code for each live in the other skills below.

## Workflow

### 1. Decide: new app or existing app

- **New app:** copy the starter (next step).
- **Existing dApp:** keep its stack. Replace only the wallet layer, using the
  `use-crackpay-sdk` skill. For a MiniPay app use `port-minipay-to-crackpay`.

### 2. Scaffold from the starter

`assets/starter/` next to this file is a complete Vite + React + TypeScript Mini
App: auto-connect, the USDC balance, and a demo payment with error handling.

1. Copy every file from `assets/starter/` into the user's project directory,
   keeping the layout.
2. Rename `gitignore.txt` to `.gitignore`.
3. Set `name` in `package.json` and `<title>` in `index.html`.
4. Run `npm install`, then `npm run dev`.

What is in it:

| File | Purpose |
|---|---|
| `src/App.tsx` | `useCrackPay()` states, balance, the demo payment form |
| `src/crackpay.ts` | Balance read and `sendUsdc`, the two wallet operations |
| `src/style.css` | A 420 px single column with light and dark themes |
| `vite.config.ts` | Allows tunnel hosts, for testing in Developer mode |

The demo payment sends 0.01 USDC to a typed address. It exists to prove the
round trip. Replace it with a call to the user's own contract: a listed app may
only call the contracts in its listing, so a plain send works in Developer mode
and nowhere else.

For Next.js, do not copy the starter. Create the app with `create-next-app`,
install `@crackpay/miniapp-sdk viem`, and put the wallet code in a Client
Component (`"use client"`), following `use-crackpay-sdk`.

### 3. Build the feature

- Wallet connection and SDK API: **`use-crackpay-sdk`**
- Payments, balances, contract calls, errors: **`send-crackpay-transactions`**

### 4. Test inside CrackPay

Use **`test-crackpay-miniapp`**. The app cannot be exercised in a plain browser
tab: outside CrackPay there is no wallet.

### 5. Get it listed

Use **`list-crackpay-miniapp`**. CrackPay's admins list apps; a developer
submits a listing file naming the app's URL and every contract it calls.

## Before saying it is done

- [ ] The app shows a clear message when opened outside CrackPay
- [ ] No connect button, no signature request, no gas code anywhere
- [ ] Token amounts use 6 decimals; native `value` uses 18
- [ ] Errors are handled by code, with a cancel treated as a cancel
- [ ] Usable at 360 px wide
- [ ] `npm run build` passes
- [ ] The user has been told how to test it in CrackPay Developer mode
