# Mini Apps

A Mini App is a web app on its own origin that CrackPay loads in an iframe and
gives a wallet to. The first one is KashLink, added early to exercise the
wallet during testing; Discover, submission and review are still Phase 3.

## How it fits together

```
Mini App (iframe, its own origin)            CrackPay page
  src/lib/miniapp/sdk.ts                       components/MiniAppHost.tsx
  EIP-1193 provider  ── postMessage ──▶        lib/miniapp/bridge.ts   answers requests
  announced via EIP-6963                       lib/miniapp/policy.ts   decides what may be sent
                     ◀── postMessage ──        confirm sheet, then passkey, then sponsored userOp
```

- The Mini App includes `sdk.ts` (one dependency-free file) and calls
  `installCrackPayProvider({ hostOrigins })`. Inside CrackPay it gets an EIP-1193
  provider, also announced through EIP-6963 and set as `window.ethereum`. In an
  ordinary tab it gets `null` and behaves as it always did.
- The app is connected from the start: `eth_requestAccounts` returns the user's
  smart account with no prompt.
- `eth_sendTransaction` is checked against the app's policy, shown to the user in
  the CrackPay page, signed with their passkey, and sent as a sponsored userOp.
  The app gets back the transaction hash, or an error if the call reverted.

## Security model

- **Origins.** CrackPay only accepts messages from the app's iframe window and its
  registered origin, and only posts to that origin. The SDK does the same in
  reverse against its `hostOrigins` list.
- **CSP.** `frame-src` lists exactly the registered apps, so nothing else can be framed.
- **Sandbox.** `allow-scripts allow-forms allow-popups allow-same-origin`. This
  differs from the implementation plan, which omits `allow-same-origin`. Without
  it the app has an opaque origin: `event.origin` is `"null"`, so origin checks
  cannot work, and the app has no storage. It is safe because the host refuses to
  load any app that shares CrackPay's own origin.
- **Policy.** Each app lists the contracts it may call. A token contract can be
  called for one thing only: approving one of those contracts. Transfers,
  approvals to anyone else, calls to unlisted contracts, contract creation and
  sends to the zero address are refused before the user is asked anything.
- **Prompts** render in the CrackPay page, never in the iframe. Amounts are rounded
  up, so a prompt never shows less than will leave the balance.
- **Keys** never leave the CrackPay page.
- **Kill switch.** `enabled: false` in the registry removes an app from the list,
  the route and the CSP.

## Not supported yet

- Message and typed-data signing (`personal_sign`, `eth_signTypedData_v4`). A smart
  account signs differently from an EOA and needs its own design.
- Batched calls (`wallet_sendCalls`). An app that needs approve-then-call sends two
  transactions and the user confirms each.
- The custom methods from the plan (`scanQrCode`, `requestContact`, `getExchangeRate`).
- Per-app spending caps on sponsorship.

## Running KashLink inside CrackPay locally

1. CrackPay: put the Circle client key and URL in `apps/web/.env.local`, then `pnpm dev` (port 3000).
2. KashLink: on its `crackpay-miniapp` branch, `npm run dev` (port 5191). In dev it
   trusts `http://localhost:3000` by default.
3. Open `http://localhost:3000/apps/kashlink`, sign in with a passkey, and fund the
   smart account from faucet.circle.com.
4. A KashLink claim link can be opened inside CrackPay by appending its fragment:
   `http://localhost:3000/apps/kashlink#<key>`.

For a deployed KashLink, set `NEXT_PUBLIC_MINIAPP_KASHLINK_URL` in CrackPay and
`VITE_CRACKPAY_ORIGINS` in KashLink to each other's origins.

## Adding another app

1. Add an entry to `src/config/miniapps.ts`: id, name, URL, and a policy listing the
   contracts it calls and the tokens it needs an allowance on.
2. In the app, copy in `sdk.ts` and call `installCrackPayProvider`.
