# CLAUDE.md — CrackPay

Project instructions for Claude Code. Read this before writing any code.

---

## What we're building

CrackPay: a self-custodial USD stablecoin wallet on **Arc** (Circle's L1, where USDC is the native gas token). Feature parity with MiniPay, shipped as a **mobile-first web app** (installable PWA). Native apps come later — do not add React Native or Capacitor unless asked.

**Users never see:** a seed phrase, a gas token, a chain name, the word "wallet address" on the main flow.
**Users do see:** one dollar balance, a Send button, a phone number or handle.

### Hard scope boundaries

- **No fiat onramp.** Do not build, stub, or scaffold a "buy stablecoins" flow. Funding comes from receiving, crosschain deposits, or claiming a Cash Link.
- **No cNGN or local-currency stablecoins.** USDC only, EURC optional later.
- **No multi-chain asset list.** One balance. Crosschain is a funding mechanism, not a feature surface.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), TypeScript strict | PWA: manifest + service worker |
| Styling | Tailwind | Design at 360–420px first |
| Chain client | viem + wagmi | `arcTestnet` ships in `viem/chains` |
| Accounts | `@circle-fin/modular-wallets-core` (Web SDK) | Passkey smart accounts (ERC-4337) |
| Gas | Circle Gas Station | `paymaster: true` on every userOp |
| Payments SDK | Circle App Kit + viem adapter | Send, Swap, Bridge, Unified Balance, Earn |
| Backend | Supabase (Postgres, Auth, Edge Functions, Realtime) | |
| Contracts | Solidity + Arc Foundry | Circle's Foundry fork: `arc-forge`, `arc-cast`, `arc-anvil` |
| Hosting | Vercel | |

Do not introduce ethers.js, web3.js, Hardhat, or a second state library. Do not add a database ORM beyond the Supabase client.

---

## Arc network facts

```ts
// Testnet
chainId: 5042002
rpc:     "https://rpc.testnet.arc.network"
ws:      "wss://rpc.testnet.arc.network"
explorer:"https://testnet.arcscan.app"
faucet:  "https://faucet.circle.com"

import { arcTestnet } from "viem/chains";

// Modular Wallets transport path segment
toModularTransport(`${clientUrl}/arcTestnet`, clientKey)
```

**Never hardcode token addresses.** Read them from Arc's Contract Addresses page and put them in `src/config/contracts.ts` with a comment naming the source and date.

**If you see chain ID `1516` anywhere, it is wrong.** The correct Arc Testnet chain ID is `5042002`.

---

## Arc gotchas — these will bite

Violating any of these produces bugs that look like something else. Re-read before touching balances, history, or transfers.

1. **Decimals split by interface.** Native USDC (gas balance) = **18 decimals**. ERC-20 USDC interface = **6 decimals**. Circle's SDK uses `parseUnits(amount, 6)`.
   → Standardize internally on **6-decimal bigint base units**. Convert only at the RPC boundary and the display layer. Never pass a float.
   → `src/lib/money.ts` is the only place conversion logic may live. Everything else imports from it.

2. **One balance, not two.** Native and ERC-20 USDC are the same balance. Never render two rows. Never sum them.

3. **Transfer events come from a system emitter.** A system address (`0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE`) logs all USDC `Transfer` events. The indexer subscribes **there**, not to the token contract. Subscribing to the token contract alone will silently miss transfers.

4. **Fee floor.** The mempool enforces a 20 Gwei `maxFeePerGas` floor. Clamp estimates up to it.

5. **Blocklist reverts burn gas with no receipt.** Model `SUBMITTED_NO_RECEIPT` as its own terminal transaction state. Do not retry automatically.

6. **`address(0)` transfers revert.** Validate recipients before building the userOp.

7. **Finality is sub-second.** No confirmation counter, no "pending" spinner beyond the round trip. The success screen appears almost immediately.

---

## Repo layout

```
/contracts              Foundry project
  src/IdentityRegistry.sol
  src/CashLink.sol
  src/PaymentRouter.sol
  test/
/apps/web               Next.js PWA
  src/app/              routes
  src/components/
  src/lib/
    money.ts            ALL decimal conversion
    arc.ts              chain + client setup
    wallet.ts           Modular Wallets: create, login, sign
    userop.ts           userOp builder, always paymaster: true
  src/config/
    contracts.ts        addresses, sourced + dated
/supabase
  migrations/
  functions/            Edge Functions
/docs
  implementation-plan.md
```

---

## Conventions

- **TypeScript strict.** No `any`. No non-null assertions on chain data.
- **Money is `bigint`**, always. A `number` holding an amount is a bug. Format only at render.
- **Every userOp passes `paymaster: true`.** If a flow can't be sponsored, stop and ask before shipping it.
- **Errors are typed and surfaced.** Never swallow a chain error into a generic "Something went wrong" without logging the real one.
- **Server-side secrets stay server-side.** Phone salts, Circle secret keys, and the attestation signing key never reach the client bundle. Audit `NEXT_PUBLIC_` usage.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`).
- Run `pnpm typecheck && pnpm lint` before declaring a task done. For contracts, `arc-forge test`.

---

## Security rules — non-negotiable

- **The backend never holds signing authority over user funds.** Users hold passkeys. If a design needs a server-side key over user money, stop and ask.
- **Phone numbers are never stored or emitted in plaintext on-chain.** Per-user salted hashes only; the salt lives server-side.
- **Phone resolution is a rate-limited backend API,** never a public bulk-readable on-chain mapping. The registry must not be enumerable by anyone holding a phone-number list.
- **Cash Link secrets live in the URL fragment** (`#secret`) and must never be sent to the server or logged.
- **Paymaster sponsorship is capped** per user and per device, and only sponsors calls to allowlisted targets (USDC, CrackPay contracts, Earn vaults). Cash Link claims are the highest-abuse path — cap them hardest.
- **Mini Apps (phase 3)** run in a sandboxed iframe with strict `postMessage` origin checks and a CSP `frame-src` allowlist. The iframe never gets key access; sensitive prompts render in the parent frame.

---

## Passkey constraint — read before deploying anywhere

Passkeys are bound to the **domain** they are created on. Changing the domain later invalidates every existing credential and locks users out.

→ Lock the production domain and set it as the passkey domain in Circle Console **before** any real user registers. Use that same domain for staging via a subdomain, not a different host.

---

## Build order

Work in this order. Do not start a phase until the previous one's exit criteria pass.

**Phase 0 — spikes.** Prove each separately in a scratch route, then delete the scratch:
1. Passkey wallet creation + sponsored USDC transfer on Arc Testnet, in a browser
2. Read USDC `Transfer` events via the system emitter
3. Unified Balance deposit from Base Sepolia, spend on Arc
4. WebAuthn register + sign on Android Chrome and iOS Safari, including reload-and-reauthenticate
5. PWA install prompt + Web Push on Android

**Phase 1 — core wallet.** Phone OTP → attestation → `IdentityRegistry` registration → passkey onboarding → home balance → send → activity feed → recovery setup → PWA shell.
*Exit: two new users onboard and pay each other in under 60s on a phone browser.*

**Phase 2 — parity.** Cash Links (including claim-creates-wallet), Pockets swap, Earn, Unified Balance funding, merchant payments + `PaymentRouter`.

**Phase 3 — Mini Apps.** iframe host, provider shim, Discover, review queue.

**Phase 4 — partners + mainnet.** Audit, mainnet Gas Station policy, KYC tiers, offramp/card/virtual-account partners.

Full detail is in `docs/implementation-plan.md`. That file is the source of truth for scope — read it before planning work.

---

## When to stop and ask

- A flow can't be gas-sponsored.
- A design would need the server to hold keys or move user funds.
- Phone data would become enumerable or leave the server in plaintext.
- You're about to add a dependency not listed in the Stack table.
- Arc behaves differently from the gotchas above — document what you actually observed rather than working around it silently.
- Mainnet is involved in any way.
