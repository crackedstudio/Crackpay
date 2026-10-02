---
name: send-crackpay-transactions
description: Send transactions, read USDC balances and handle errors correctly from a CrackPay Mini App on Arc. Covers Arc's two USDC decimal scales (6 as a token, 18 as a native value), sponsored gas, paying a contract, the approve-then-call token flow, what a listed app may call, receipts under account abstraction, error codes, and contract requirements for smart accounts. Use when writing payment, balance, contract-call or error-handling code for a CrackPay Mini App, or when amounts look wrong by a factor of 10^12, a call is rejected with 4100, or a transaction fails inside CrackPay.
---

# Transactions and balances in a CrackPay Mini App

Assumes the app is already connected; see `use-crackpay-sdk`. Snippets use
`account`, `walletClient` and `publicClient` from `connectCrackPay()`.

## Arc is not Ethereum

**USDC has two decimal scales, and they are one balance.**

| Interface | Decimals | Where it appears |
|---|---|---|
| Native | 18 | `value` on a transaction, `eth_getBalance`, `msg.value` |
| ERC-20 at `0x3600000000000000000000000000000000000000` | 6 | `balanceOf`, `transfer`, `approve` |

One dollar is `parseEther("1")` as a native `value` and `parseUnits("1", 6)`
through the token contract. Never add the two, never show both, and never pass a
6-decimal number as a `value`: that sends a trillionth of the intended amount.

**There is no gas token.** Gas is USDC and CrackPay pays it. Do not estimate
gas, set gas fields, show a network fee or keep a gas reserve.

**Transactions are final in under a second.** No confirmation counts.

## Read a balance

```ts
import { tokens } from "@crackpay/miniapp-sdk";
import { erc20Abi, formatUnits } from "viem";

const raw = await publicClient.readContract({
  address: tokens.USDC.address,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account],
});
const dollars = formatUnits(raw, tokens.USDC.decimals); // "12.5"
```

Use this for display, not `getBalance`, which returns the 18-decimal figure.
Keep amounts as `bigint` and format only when rendering. Show dollars with two
decimals.

## Send a transaction

```ts
const hash = await walletClient.writeContract({
  account,
  chain: walletClient.chain,
  address: CONTRACT,
  abi,
  functionName: "pay",
  args: [orderId],
  value: parseEther("1.50"), // native USDC
});
```

What happens:

1. CrackPay checks the call against the app's listing. Not allowed → rejects
   with `4100`, and the user sees nothing.
2. CrackPay shows the user the amount and where it goes.
3. The user approves with their passkey.
4. CrackPay sends it with gas sponsored and waits for it to land.
5. The promise resolves with the transaction hash. It is already final.

So: show a waiting state only while the call is pending. Do not poll for
confirmations afterwards. A revert rejects the promise; it never returns a hash.

Request rules:

| Field | Behaviour |
|---|---|
| `to` | Required. No contract creation. The zero address is refused. |
| `data` | Optional. |
| `value` | Optional. Native USDC, 18 decimals. |
| `gas`, `gasPrice`, `maxFeePerGas`, `maxPriorityFeePerGas`, `nonce` | Ignored. |

**One call per transaction.** There is no batching and no `wallet_sendCalls`.

## Design payments so they need one confirmation

Prefer a `payable` function that takes native USDC:

```solidity
function pay(bytes32 orderId) external payable {
    // msg.value is USDC with 18 decimals
}
```

One transaction, one confirmation, and CrackPay shows the user the exact amount
leaving their balance.

## Tokens other than native USDC

For EURC, or any flow built on `transferFrom`, send two transactions and await
each. The user confirms both.

```ts
import { tokens } from "@crackpay/miniapp-sdk";
import { erc20Abi, parseUnits } from "viem";

const amount = parseUnits("5", tokens.EURC.decimals);

await walletClient.writeContract({
  account,
  chain: walletClient.chain,
  address: tokens.EURC.address,
  abi: erc20Abi,
  functionName: "approve",
  args: [CONTRACT, amount], // approve the exact amount, never an unlimited one
});

await walletClient.writeContract({
  account,
  chain: walletClient.chain,
  address: CONTRACT,
  abi,
  functionName: "payWithToken",
  args: [tokens.EURC.address, amount],
});
```

## What a listed app may call

| Call | Listed app | Test app (Developer mode) |
|---|---|---|
| A contract in its listing | Allowed | Allowed |
| Any other contract or address | Refused, `4100` | Allowed |
| `approve(spender, amount)` on a listed token, `spender` in its listing | Allowed | Allowed |
| `approve` to any other spender | Refused, `4100` | Allowed |
| `transfer` or `transferFrom` on a token | Refused, `4100` | Allowed |

Never call `transfer` or `transferFrom` on a token directly. Move tokens through
the app's own contract. Build to these rules from the start: a flow that works in
Developer mode and breaks them will stop working once the app is listed.

## Receipts

The returned hash is the transaction that carried the user's operation on-chain.
In its receipt:

- `from` is a bundler and `to` is the ERC-4337 EntryPoint, not the app's contract.
- The app's events are in `logs`. Decode them with `parseEventLogs`.
- Inside the contract, `msg.sender` was the user's account.

Link to it as `${arcTestnet.explorerUrl}/tx/${hash}` using `arcTestnet` from
`@crackpay/miniapp-sdk`.

## Errors

Match on the code, never on message text.

```ts
import { ErrorCode, errorCode, isUserRejection } from "@crackpay/miniapp-sdk";

try {
  await walletClient.writeContract(request);
} catch (error) {
  if (isUserRejection(error)) return show("Cancelled.");
  if (errorCode(error) === ErrorCode.Unauthorized) {
    console.error("This call is not allowed for the app; check its listing", error);
  }
  console.error(error);
  show("The payment didn't go through. Please try again.");
}
```

| Code | `ErrorCode.` | Meaning | Tell the user |
|---|---|---|---|
| `4001` | `UserRejected` | Cancelled the confirmation or the passkey | "Cancelled." Let them retry. |
| `4100` | `Unauthorized` | Not allowed for this app | A bug or a missing listing entry. Generic failure. |
| `4200` | `UnsupportedMethod` | Method not supported | Do not call it. |
| `4902` | `UnrecognizedChain` | Asked for a chain other than Arc | Do not switch chains. |
| `-32602` | `InvalidParams` | Malformed request | Fix the request. |
| `-32603` | `Internal` | Reverted, never confirmed, or a failure in CrackPay | "The payment didn't go through." |

`errorCode` reads the code whether the error came from the provider or wrapped
by viem or wagmi. Always log the original error.

**One case needs care.** A `-32603` whose message says the operation "was
submitted but never confirmed" means the payment may or may not have happened.
Tell the user to check their balance before trying again, and never retry
automatically.

## Contracts the app calls

They must work when the caller is a smart contract account:

- No `require(tx.origin == msg.sender)`.
- No "caller must have no code" checks (`extcodesize`, `isContract`).
- No reliance on an ECDSA signature from the user. Use `msg.sender`.
- Treat `msg.value` as 18-decimal USDC. Do not mix it with a token `balanceOf`
  in arithmetic: the scales differ by 10^12.
- Sends to the zero address revert on Arc.

For listing, each contract must be verified on the Arc explorer; see
`list-crackpay-miniapp`.
