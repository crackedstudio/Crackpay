# Phase 0 status

Last updated 2 October 2026. Tracks the seven bootstrap tasks in `setup.md`.
The Phase 0 gate is not passed until every row below is verified.

| Task | State | What is left |
|---|---|---|
| 1 Scaffold | Verified | — |
| 2 Chain config | Verified (unit tests) | — |
| 3 Passkey wallet + sponsored transfer | Built, not run | Needs Circle client key; run `/spike/wallet` |
| 4 Event indexing | Verified against live testnet | Confirm it logs the Task 3 transfer |
| 5 Cross-browser passkeys | Not started | Needs staging deploy, an Android phone and an iPhone |
| 6 PWA shell | Built, smoke-tested locally | Install and push on Android Chrome over HTTPS |
| 7 Crosschain funding | Built, balance query verified | Run deposit and spend with a funded testnet key |

## How to run what is left

**Task 3.** Put `NEXT_PUBLIC_CIRCLE_CLIENT_KEY` and `NEXT_PUBLIC_CIRCLE_CLIENT_URL`
(`https://modular-sdk.circle.com/v1/rpc/w3s/buidl`) in `apps/web/.env.local`, add
`localhost` as a passkey domain in Circle Console, run `pnpm dev`, open
`/spike/wallet`. Register, fund the shown address from faucet.circle.com, send.

**Task 4.** From `apps/web`:
`node --experimental-strip-types scripts/watch-transfers.ts --backfill 0 --watch 120`
while sending the Task 3 transfer.

**Task 6.** `node --experimental-strip-types scripts/generate-vapid-keys.ts`, paste
the output plus a `VAPID_SUBJECT` (`mailto:` or `https:` URL) into `.env.local`,
deploy to an HTTPS host, open `/spike/pwa` on Android Chrome.

**Task 7.** From `apps/web`, with a throwaway EOA holding Base Sepolia USDC and ETH:

```bash
export SPIKE_EVM_PRIVATE_KEY=0x...
node --experimental-strip-types scripts/unified-balance.ts deposit 1
node --experimental-strip-types scripts/unified-balance.ts spend 1 <smart account from Task 3>
```

## Findings

- **Events.** The system emitter sees every non-zero USDC movement at 18 decimals.
  The ERC-20 contract also logs ERC-20 `transfer()` calls at 6 decimals, so the two
  overlap; it misses native sends (about 19% of transactions in a 300-block sample).
  The indexer should read the system emitter only. Numbers are in the header of
  `scripts/watch-transfers.ts`.
- **viem is pinned to 2.55.11.** `@circle-fin/modular-wallets-core` 1.0.16 depends on
  that exact version; a second copy breaks the client types.
- **web3.js arrives transitively** through `@circle-fin/modular-wallets-core`. Nothing
  in CrackPay imports it.
- **Web Push uses a hand-written VAPID signer** (`src/lib/server/vapid.ts`) and sends
  payload-less pushes, to avoid adding a push library. Notifications with custom text
  need payload encryption (RFC 8291), which means either more code or `web-push`.
- **Contracts use Arc Foundry** v0.8.0-2 (`arc-forge`, `arc-cast`, `arc-anvil`), as Arc's
  docs recommend. Install from https://github.com/circlefin/arc-foundry/releases into
  `~/.local/bin`; see https://docs.arc.io/arc/tutorials/install-arc-foundry.

## Open questions

- **Fee floor.** Not yet checked whether Circle's bundler gas estimates already respect
  the 20 Gwei `maxFeePerGas` floor. Check on the first Task 3 send; clamp in
  `userop.ts` if not.
- **Unified Balance with passkey accounts.** A smart account cannot sign Unified
  Balance burn intents itself; Circle's answer is an EOA delegate. The spike avoids
  this by depositing from an external EOA and spending to the smart account. Working
  assumption: users only fund this way and never hold a Unified Balance of their own.
  Revisit before Phase 2 if that changes.
- **Explorer URL.** viem and the plan use `testnet.arcscan.app`; Arc's docs now link
  `explorer.testnet.arc.io`. The app uses viem's value.
