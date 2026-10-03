# Reference

## `@crackpay/miniapp-sdk`

```bash
npm install @crackpay/miniapp-sdk
```

| Export | Description |
|---|---|
| `getCrackPayProvider(options?)` | `Promise<Provider \| null>`. The provider inside CrackPay, `null` elsewhere. Resolves within 3 seconds. Never prompts. |
| `isFramed()` | `boolean`. Whether the page is in a frame. Synchronous. |
| `CRACKPAY_ORIGINS` | The CrackPay hosts the package trusts by default. |
| `arcTestnet` | `{ id, hexId, name, rpcUrl, explorerUrl, faucetUrl }` |
| `tokens` | `tokens.USDC` and `tokens.EURC`: `{ symbol, address, decimals }` |
| `NATIVE_USDC_DECIMALS` | `18`. USDC's scale as a transaction `value`. |
| `ErrorCode` | Named error codes. See below. |
| `errorCode(error)` | The numeric code of an error, even when wrapped by viem or wagmi. |
| `isUserRejection(error)` | `true` when the user cancelled. |
| `getCrackPayUser(provider)` | The user's `{ account, handle }`. `handle` is their CrackPay handle without the "@", or `null`. Never prompts. Since 0.2.0. |

Options: `hostOrigins` (CrackPay hosts to accept) and `timeoutMs` (default `3000`).

| Entry point | Export | Needs |
|---|---|---|
| `@crackpay/miniapp-sdk/viem` | `connectCrackPay(options?)` → `{ provider, account, handle, walletClient, publicClient }` or `null` | `viem` |
| `@crackpay/miniapp-sdk/react` | `useCrackPay(options?)` → `{ status, provider?, account?, handle?, error? }` | `react` |

## `window.crackpay` (script tag)

Defined by `https://crackpay.vercel.app/miniapp-sdk.js`, for pages without a bundler.

| Member | Type | Description |
|---|---|---|
| `ready` | `Promise<Provider \| null>` | Same result as `getCrackPayProvider()`. |
| `version` | `number` | Protocol version. Currently `1`. |

## Provider

A standard [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) provider.

| Member | Description |
|---|---|
| `isCrackPay` | Always `true`. |
| `request({ method, params })` | Sends a request. Rejects with an error that has a numeric `code`. |
| `on(event, listener)` / `removeListener(event, listener)` | Subscribes to provider events. |

Announced through EIP-6963 with `name: "CrackPay"` and `rdns: "app.crackpay"`.

## Supported methods

### Wallet

| Method | Result |
|---|---|
| `eth_requestAccounts`, `eth_accounts` | `[account]`. Never prompts. |
| `eth_chainId` | `"0x4cef52"` |
| `net_version` | `"5042002"` |
| `wallet_switchEthereumChain` | `null` for Arc. Error `4902` for any other chain. |
| `wallet_addEthereumChain` | `null` for Arc. Error `4200` for any other chain. |
| `eth_sendTransaction` | The transaction hash, once final. See [Transactions](./transactions.md). |
| `crackpay_getProfile` | `{ account, handle }`: the user's CrackPay handle without the "@", or `null`. Never prompts. |

### Read-only, forwarded to an Arc node

`eth_blockNumber`, `eth_call`, `eth_estimateGas`, `eth_feeHistory`,
`eth_gasPrice`, `eth_getBalance`, `eth_getBlockByHash`, `eth_getBlockByNumber`,
`eth_getCode`, `eth_getLogs`, `eth_getStorageAt`, `eth_getTransactionByHash`,
`eth_getTransactionCount`, `eth_getTransactionReceipt`, `eth_maxPriorityFeePerGas`.

### Not supported

Everything else returns error `4200`, including:

- `personal_sign`, `eth_sign`, `eth_signTypedData`, `eth_signTypedData_v3`, `eth_signTypedData_v4`
- `eth_sendRawTransaction`, `eth_signTransaction`
- `wallet_sendCalls` and the rest of EIP-5792
- `wallet_requestPermissions`, `wallet_getPermissions`, `wallet_watchAsset`

## Events

The provider implements `on` and `removeListener`. CrackPay does not emit
`accountsChanged` or `chainChanged` today, because neither changes during a
session. Subscribing is harmless.

## Error codes

| Code | `ErrorCode.` | Meaning |
|---|---|---|
| `4001` | `UserRejected` | Cancelled the confirmation or the passkey prompt |
| `4100` | `Unauthorized` | Not allowed by your app's listing |
| `4200` | `UnsupportedMethod` | |
| `4902` | `UnrecognizedChain` | Only Arc is available |
| `-32602` | `InvalidParams` | |
| `-32603` | `Internal` | Reverted, never confirmed, or a failure inside CrackPay |

## Not available yet

These exist in MiniPay and are planned for CrackPay. Do not depend on them.

- Custom methods: QR scanning, contact picker, exchange rates
- Phone-number lookup
- Message and typed-data signing
- Batched calls
- Deep links into a Mini App from outside CrackPay

## Limits

- One call per transaction.
- Listed apps may only call the contracts in their listing.
- Only Arc. Requests for any other chain are refused.
