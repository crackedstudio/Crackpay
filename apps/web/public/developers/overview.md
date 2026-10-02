# CrackPay Mini Apps

A Mini App is an ordinary web app that runs inside CrackPay and uses the
CrackPay user's wallet. You host it on your own domain. CrackPay opens it in a
frame, gives it an Ethereum provider, and asks the user to confirm anything it
wants to send.

If you have built for MiniPay, the model is the same: the wallet is already
connected when your page loads, there is no "Connect wallet" button, and users
find your app in a directory inside the wallet. The differences are the chain
(Arc, where USDC is the gas token) and how the provider reaches your page.

## What your app gets

- **A connected wallet from the first line of code.** `eth_requestAccounts`
  returns the user's account with no prompt.
- **Gas-free transactions.** CrackPay sponsors gas. The user never needs a gas
  token, and your app never estimates or pays fees.
- **Dollar-native users.** Every CrackPay account holds USDC on Arc.
- **Sub-second finality.** A sent transaction is final when the call returns.

## How it works

```
Your app (your domain, in a frame)            CrackPay
  @crackpay/miniapp-sdk                         checks the request against your listing
  EIP-1193 provider  ── postMessage ──▶         shows the user a confirmation
                     ◀── postMessage ──         signs with the user's passkey, sends it
```

Your page never sees a key. It asks; CrackPay shows the request to the user in
its own interface, signs with their passkey, and sends the transaction.

## Two stages

| Stage | How your app is loaded | What it may call |
|---|---|---|
| **Testing** | You paste its URL into Developer mode | Any contract. Every prompt is marked as a test app. |
| **Listed** | Users open it from the Apps page | Only the URL and contracts CrackPay approved for your listing. |

CrackPay controls the listing: the team reviews your app, records its URL and
the contracts it calls, and can switch it off. See [Get listed](./listing.md).

## Network

CrackPay currently runs on **Arc Testnet**. Arc Mainnet will follow. Developer
mode and listings will be available on both networks, and a listing names the
network it is for.

| | |
|---|---|
| CrackPay | `https://crackpay.vercel.app` |
| SDK | [`@crackpay/miniapp-sdk`](https://www.npmjs.com/package/@crackpay/miniapp-sdk) on npm |
| Chain ID | `5042002` (`0x4cef52`) |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://explorer.testnet.arc.io` |
| Faucet | `https://faucet.circle.com` |
| USDC (ERC-20 interface, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| EURC (6 decimals) | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

Arc differs from other EVM chains in ways that matter for payments. Read
[Transactions](./transactions.md) before writing balance or transfer code.

## Next

1. [Quick start](./quick-start.md): a working Mini App in a few minutes.
2. [Test in CrackPay](./test-in-crackpay.md): load it with Developer mode.
3. [Get listed](./listing.md): what CrackPay needs to approve it.

Building with an AI coding assistant? Give it [SKILL.md](./SKILL.md).
