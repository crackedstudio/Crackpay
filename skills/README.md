# CrackPay Skills

Skills that teach AI coding assistants to build Mini Apps for
[CrackPay](https://crackpay.vercel.app), the USD stablecoin wallet on Arc.

A Mini App is your own web app, opened inside CrackPay and connected to the
user's wallet. With these skills installed, an assistant such as Claude Code,
Cursor or Codex knows how to scaffold one, use the
[`@crackpay/miniapp-sdk`](https://www.npmjs.com/package/@crackpay/miniapp-sdk),
handle USDC correctly on Arc, test in Developer mode, and prepare a listing.

Documentation for people: <https://crackpay.vercel.app/developers>

## Install

### Claude Code

```
/plugin marketplace add crackedstudio/crackpay-skills
/plugin install crackpay-skills@crackpay
```

### Other assistants (Cursor, Codex, Copilot, …)

```bash
npx skills add crackedstudio/crackpay-skills
```

## Skills

| Skill | Use it to |
|---|---|
| `build-crackpay-miniapp` | Start a Mini App. Includes a Vite + React starter the assistant copies in. |
| `use-crackpay-sdk` | Connect to the wallet with the SDK: viem, React, wagmi or a script tag. |
| `send-crackpay-transactions` | Send payments, read balances, call contracts and handle errors on Arc. |
| `test-crackpay-miniapp` | Load the app in CrackPay's Developer mode and debug it. |
| `list-crackpay-miniapp` | Write the listing file and submit the app for review. |
| `port-minipay-to-crackpay` | Move a MiniPay or other EVM app onto CrackPay. |

They activate on their own when a task matches. You can also ask directly:

> Create a CrackPay Mini App that lets someone pay for an order in USDC.

> Port this MiniPay app to CrackPay and keep it working in both.

> Why is my Mini App blank when I load it in CrackPay?

## What the skills hold an assistant to

- Connect on load; never show a connect button or ask for a signature.
- Never handle gas: CrackPay sponsors it.
- USDC is 6 decimals as a token and 18 as a transaction value. One balance.
- A listed app calls only the contracts in its listing.

## License

MIT
