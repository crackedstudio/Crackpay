# @crackpay/miniapp-sdk API

Version 0.3.0.

## `@crackpay/miniapp-sdk`

| Export | Type | Description |
|---|---|---|
| `getCrackPayProvider(options?)` | `Promise<MiniAppProvider \| null>` | The provider inside CrackPay, `null` elsewhere. Resolves within `timeoutMs`. Never prompts. |
| `isFramed()` | `boolean` | Whether the page is in a frame. Synchronous. |
| `CRACKPAY_ORIGINS` | `readonly string[]` | Hosts trusted by default: `["https://crackpay.xyz", "https://crackpay.vercel.app"]` (mainnet, testnet). |
| `arcTestnet` | object | `{ id: 5042002, hexId: "0x4cef52", name, rpcUrl, explorerUrl, faucetUrl, testnet: true }` |
| `arcMainnet` | object | `{ id: 5042, hexId: "0x13b2", name: "Arc", rpcUrl, explorerUrl, faucetUrl: null, testnet: false }` |
| `ARC_CHAINS` | array | `[arcMainnet, arcTestnet]` |
| `getArcChain(chainId)` | `ArcChainInfo \| null` | The Arc network for a number or the hex string `eth_chainId` returns. |
| `getTokens(chainId)` | object \| `null` | That network's `USDC` and `EURC`: `{ symbol, address, decimals: 6 }`. EURC's address differs by network. |
| `tokensByChain` | object | The same, keyed by chain id. |
| `tokens` | object | Deprecated: testnet only. Use `getTokens(chainId)`. |
| `NATIVE_USDC_DECIMALS` | `18` | USDC's scale as a transaction `value` or from `eth_getBalance`. |
| `ErrorCode` | object | `UserRejected` 4001, `Unauthorized` 4100, `UnsupportedMethod` 4200, `UnrecognizedChain` 4902, `InvalidParams` -32602, `Internal` -32603 |
| `errorCode(error)` | `number \| undefined` | The code of an error, looking through one level of `cause` (viem and wagmi wrap errors). |
| `isUserRejection(error)` | `boolean` | True when the user cancelled. |
| `getCrackPayUser(provider)` | `Promise<CrackPayUser>` | The user's `{ account, handle }`. `handle` is their CrackPay handle without the "@", or `null`. Never prompts. |
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
  handle: string | null; // CrackPay handle without the "@"
  chain: ArcChainInfo; // arcMainnet or arcTestnet: whichever CrackPay the app is open in
  walletClient: WalletClient; // chain: that network, transport: the CrackPay provider
  publicClient: PublicClient; // chain: that network, transport: http(rpcUrl ?? chain.rpcUrl)
};
```

When calling `walletClient.writeContract` or `sendTransaction`, pass
`account` and `chain: walletClient.chain`.

## `@crackpay/miniapp-sdk/react`

`useCrackPay(options?: CrackPayOptions)` → `CrackPayState`

```ts
type CrackPayState =
  | { status: "connecting" }
  | { status: "connected"; provider: MiniAppProvider; account: `0x${string}`; handle: string | null }
  | { status: "unavailable" } // not inside CrackPay
  | { status: "error"; error: unknown };
```

## Provider methods

| Method | Result |
|---|---|
| `eth_requestAccounts`, `eth_accounts` | `[account]`. Never prompts. |
| `eth_chainId` | `"0x4cef52"` on testnet, `"0x13b2"` on mainnet |
| `net_version` | `"5042002"` on testnet, `"5042"` on mainnet |
| `wallet_switchEthereumChain` | `null` for Arc; error 4902 otherwise |
| `wallet_addEthereumChain` | `null` for Arc; error 4200 otherwise |
| `eth_sendTransaction` | The transaction hash, once final |
| `crackpay_getProfile` | `{ account, handle }`. `handle` is the CrackPay handle without the "@", or `null`. Never prompts. Use `getCrackPayUser`. |

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
