# Transactions and balances

## Arc is not Ethereum

Arc's native token is USDC. Three consequences shape every payment flow.

**1. USDC has two decimal scales.** They describe one balance.

| Interface | Decimals | Where you meet it |
|---|---|---|
| Native | 18 | `value` on a transaction, `eth_getBalance`, `msg.value` |
| ERC-20 at `0x3600000000000000000000000000000000000000` | 6 | `balanceOf`, `transfer`, `approve` |

One dollar is `1000000000000000000` as a native `value` and `1000000` through
the ERC-20 interface. Never add the two together and never show both; they are
the same money. For display and for token calls, use the ERC-20 interface.

**2. There is no gas token to hold.** Gas is USDC, and CrackPay pays it.

**3. Transactions are final in under a second.** No confirmation counts.

Full details: [Arc's EVM differences](https://docs.arc.io/arc/references/evm-differences).

## Reading a balance

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

`publicClient` here is the one `connectCrackPay()` returns. Reading through the
provider works too.

## Sending a transaction

```ts
const hash = await provider.request({
  method: "eth_sendTransaction",
  params: [{ from: account, to: "0xYourContract", data: "0x…", value: "0x0" }],
});
```

What happens:

1. CrackPay checks the call against your listing. If it is not allowed, the
   promise rejects with `4100` and the user sees nothing.
2. The user sees a confirmation in CrackPay showing the amount and where it goes.
3. They approve with their passkey.
4. CrackPay sends it with gas sponsored and waits for it to land.
5. The promise resolves with the transaction hash. The transaction is already final.

Rules for the request:

| Field | Behaviour |
|---|---|
| `to` | Required. Contract creation is not supported. The zero address is refused. |
| `data` (or `input`) | Optional; defaults to `0x`. |
| `value` | Optional hex. Native USDC, **18 decimals**. |
| `from` | Optional. If present it must be the connected account. |
| `gas`, `gasPrice`, `maxFeePerGas`, `maxPriorityFeePerGas`, `nonce` | Ignored. |

**One call per transaction.** There is no batching yet. To spend a token other
than native USDC, send an `approve` and then your call; the user confirms each.

**Paying your contract in USDC.** Prefer a `payable` function and send native
`value`. It is one confirmation, and the user sees the exact amount leaving.

## What a token call may do

In a **listed** app, a call to a token contract is allowed for one thing only:
`approve(spender, amount)` where `spender` is one of your listed contracts. A
`transfer`, a `transferFrom`, or an approval to any other address is refused
with `4100`. Move tokens through your own contract.

In a **test** app everything is allowed, so check that your flow fits this rule
before you submit.

## After it is sent

The returned hash is the hash of the transaction that carried the user's
operation on-chain. When you fetch its receipt:

- `status` being `success` is already guaranteed. If your call had reverted,
  `eth_sendTransaction` would have rejected instead of returning a hash.
- `from` is a bundler and `to` is the ERC-4337 EntryPoint, not your contract.
- Your contract's events are in `logs`, and inside your contract `msg.sender`
  was the user's account.

## Errors

Match on `error.code`, not on message text.

| Code | Meaning | What to show |
|---|---|---|
| `4001` | The user cancelled the confirmation or the passkey prompt | "Cancelled." Let them try again. |
| `4100` | The call is not allowed for your app | A bug on your side, or a contract missing from your listing |
| `4200` | Method not supported | See the [reference](./reference.md) |
| `4902` | You asked to switch to a chain other than Arc | Use Arc only |
| `-32602` | Malformed request | Check the parameters |
| `-32603` | The call reverted, was never confirmed, or something failed in CrackPay | "The payment didn't go through." The message has detail for your logs. |

```ts
import { ErrorCode, errorCode, isUserRejection } from "@crackpay/miniapp-sdk";

try {
  await walletClient.writeContract(/* … */);
} catch (error) {
  if (isUserRejection(error)) return show("Cancelled.");
  if (errorCode(error) === ErrorCode.Unauthorized) console.error("Contract is not in this app's listing");
  console.error(error);
  show("The payment didn't go through. Please try again.");
}
```

`errorCode` finds the code whether the error came straight from the provider or
wrapped by viem or wagmi.

A `-32603` that says the operation "was submitted but never confirmed" is
special: the payment may or may not have happened. Tell the user to check
their balance before trying again, and do not retry automatically.
