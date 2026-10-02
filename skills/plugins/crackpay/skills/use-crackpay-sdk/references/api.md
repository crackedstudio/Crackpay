# @crackpay/miniapp-sdk API

Version 0.1.0.

## `@crackpay/miniapp-sdk`

| Export | Type | Description |
|---|---|---|
| `getCrackPayProvider(options?)` | `Promise<MiniAppProvider \| null>` | The provider inside CrackPay, `null` elsewhere. Resolves within `timeoutMs`. Never prompts. |
| `isFramed()` | `boolean` | Whether the page is in a frame. Synchronous. |
| `CRACKPAY_ORIGINS` | `readonly string[]` | Hosts trusted by default: `["https://crackpay.vercel.app"]`. |
| `arcTestnet` | object | `{ id: 5042002, hexId: "0x4cef52", name, rpcUrl, explorerUrl, faucetUrl }` |
| `tokens` | object | `tokens.USDC`, `tokens.EURC`: `{ symbol, address, decimals: 6 }` |
| `NATIVE_USDC_DECIMALS` | `18` | USDC's scale as a transaction `value` or from `eth_getBalance`. |
| `ErrorCode` | object | `UserRejected` 4001, `Unauthorized` 4100, `UnsupportedMethod` 4200, `UnrecognizedChain` 4902, `InvalidParams` -32602, `Internal` -32603 |
| `errorCode(error)` | `number \| undefined` | The code of an error, looking through one level of `cause` (viem and wagmi wrap errors). |
| `isUserRejection(error)` | `boolean` | True when the user cancelled. |
| `ProviderRpcError` | class | What `provider.request` rejects with. Has a numeric `code`. |
| `WALLET_INFO` | object | `{ name: "CrackPay", icon, rdns: "app.crackpay" }` |
| `PROTOCOL_VERSION` | `1` | |
| `installCrackPayProvider({ hostOrigins, timeoutMs? })` | `Promise<MiniAppProvider \| null>` | Lower level: `hostOrigins` is required. Prefer `getCrackPayProvider`. |

`CrackPayOptions`: `{ hostOrigins?: readonly string[]; timeoutMs?: number }`.
Defaults: `CRACKPAY_ORIGINS`, `3000`.

`MiniAppProvider`:

```ts
interface MiniAppProvider {
  readonly isCrackPay: true;
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on(event: string, listener: (data: unknown) => void): void;
  removeListener(event: string, listener: (data: unknown) => void): void;
}
```

To hand it to viem: `custom(provider as unknown as EIP1193Provider)`.

## `@crackpay/miniapp-sdk/viem`

`connectCrackPay(options?: CrackPayOptions & { rpcUrl?: string })`
→ `Promise<CrackPayConnection | null>`

```ts
type CrackPayConnection = {
  provider: MiniAppProvider;
  account: Address;
  walletClient: WalletClient; // chain: arcTestnet, transport: the CrackPay provider
  publicClient: PublicClient; // chain: arcTestnet, transport: http(rpcUrl)
};
```

When calling `walletClient.writeContract` or `sendTransaction`, pass
`account` and `chain: walletClient.chain`.

## `@crackpay/miniapp-sdk/react`

`useCrackPay(options?: CrackPayOptions)` → `CrackPayState`

```ts
type CrackPayState =
  | { status: "connecting" }
  | { status: "connected"; provider: MiniAppProvider; account: `0x${string}` }
  | { status: "unavailable" } // not inside CrackPay
  | { status: "error"; error: unknown };
```

## Provider methods

| Method | Result |
|---|---|
| `eth_requestAccounts`, `eth_accounts` | `[account]`. Never prompts. |
| `eth_chainId` | `"0x4cef52"` |
| `net_version` | `"5042002"` |
| `wallet_switchEthereumChain` | `null` for Arc; error 4902 otherwise |
| `wallet_addEthereumChain` | `null` for Arc; error 4200 otherwise |
| `eth_sendTransaction` | The transaction hash, once final |

Forwarded to an Arc node: `eth_blockNumber`, `eth_call`, `eth_estimateGas`,
`eth_feeHistory`, `eth_gasPrice`, `eth_getBalance`, `eth_getBlockByHash`,
`eth_getBlockByNumber`, `eth_getCode`, `eth_getLogs`, `eth_getStorageAt`,
`eth_getTransactionByHash`, `eth_getTransactionCount`,
`eth_getTransactionReceipt`, `eth_maxPriorityFeePerGas`.

Everything else rejects with 4200, including `personal_sign`, `eth_sign`,
`eth_signTypedData*`, `eth_sendRawTransaction`, `wallet_sendCalls`,
`wallet_requestPermissions` and `wallet_watchAsset`.

The provider implements `on` and `removeListener`, but CrackPay emits no
`accountsChanged` or `chainChanged`: neither changes during a session.

## `window.crackpay` (script tag)

From `https://crackpay.vercel.app/miniapp-sdk.js`.

| Member | Description |
|---|---|
| `ready` | `Promise<MiniAppProvider \| null>`, as `getCrackPayProvider()` |
| `version` | `1` |

The script trusts the origin it was loaded from. A self-hosted copy needs
`data-host-origins="https://crackpay.vercel.app"` on the tag.
