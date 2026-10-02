# CrackPay — Setup & Bootstrap Instructions

Hand this to Claude Code alongside `CLAUDE.md` and `implementation-plan.md`. It covers getting from an empty folder to a running Phase 0.

---

## 0. Before Claude Code touches anything

Things only you can do. Do these first — several of them block code.

### 0.1 Lock the domain (do this first)

Passkeys are bound to the domain they're created on. Changing it later invalidates every credential.

- [ ] Register the production domain (e.g. `crackpay.app`)
- [ ] Decide staging as a **subdomain** of it (`staging.crackpay.app`), not a different host
- [ ] Never run passkey flows on `*.vercel.app` beyond throwaway spikes

### 0.2 Circle Console

Sign up at console.circle.com.

- [ ] Create a **Client Key** (Keys → Create a key → Client Key) — used by the browser SDK
- [ ] Create an **API Key** if backend calls are needed
- [ ] Register your **passkey domain** (the domain from 0.1)
- [ ] Note your **Client URL** — the SDK appends `/arcTestnet` to it
- [ ] Confirm Gas Station sponsorship is active for Arc Testnet (testnet is sponsored automatically; mainnet needs a policy)

### 0.3 Accounts

- [ ] Supabase project
- [ ] Vercel project, pointed at the real domain
- [ ] An RPC provider account if you want better limits than the public endpoint (Alchemy, dRPC, QuickNode, Blockdaemon)
- [ ] An SMS/OTP provider (Termii and Africa's Talking are the usual picks for Nigeria; Twilio otherwise)
- [ ] Testnet USDC from faucet.circle.com

### 0.4 Local tooling

```bash
node -v        # 22+
pnpm -v
foundryup      # installs forge, cast, anvil
```

---

## 1. Environment variables

Create `.env.local` in `apps/web`. Claude Code should scaffold `.env.example` matching this, with no real values committed.

```bash
# --- Circle ---
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=        # client key, safe in browser
NEXT_PUBLIC_CIRCLE_CLIENT_URL=        # base URL; SDK appends /arcTestnet
CIRCLE_API_KEY=                       # server only, never NEXT_PUBLIC_

# --- Arc ---
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_WS_URL=wss://rpc.testnet.arc.network          # indexer, server only

# --- Contracts (fill after deploy) ---
NEXT_PUBLIC_IDENTITY_REGISTRY=
NEXT_PUBLIC_CASH_LINK=
NEXT_PUBLIC_PAYMENT_ROUTER=

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server only

# --- Secrets (server only) ---
PHONE_HASH_PEPPER=                    # global pepper; per-user salts in DB
ATTESTATION_SIGNER_KEY=               # signs OTP attestations for IdentityRegistry
SMS_PROVIDER_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# --- Deploy (contracts/.env, never committed) ---
DEPLOYER_PRIVATE_KEY=
```

**Rule for Claude Code:** anything prefixed `NEXT_PUBLIC_` ships to the browser. Before any commit, verify no secret carries that prefix.

---

## 2. Bootstrap sequence

Give Claude Code these as discrete tasks, in order. Each ends with a check you can actually run.

### Task 1 — Scaffold

> Create the repo structure from CLAUDE.md. Next.js App Router + TypeScript strict + Tailwind in `apps/web`. Foundry project in `contracts`. Supabase folder with an empty migrations dir. Add `pnpm typecheck` and `pnpm lint` scripts. Add `.env.example` with every key from the setup doc and no values. Do not install any dependency outside the Stack table.

*Check:* `pnpm dev` serves a blank page; `forge test` runs on zero tests.

### Task 2 — Chain config

> Build `src/lib/arc.ts`: public client and wallet client for `arcTestnet` from `viem/chains`, reading RPC from env. Build `src/config/contracts.ts` with USDC and EURC addresses fetched from Arc's Contract Addresses docs page — include a comment with the source URL and today's date. Build `src/lib/money.ts` as the single home for all decimal conversion: bigint base units at 6 decimals internally, helpers to parse user input and format for display, and an explicit converter for the 18-decimal native balance. No floats anywhere.

*Check:* a unit test suite on `money.ts` covering 6↔18 conversion, rounding, and display formatting passes.

### Task 3 — Spike: passkey wallet + sponsored transfer

> In a scratch route `/spike/wallet`, use `@circle-fin/modular-wallets-core` to: register a passkey, create a Circle Smart Account on Arc Testnet via `toModularTransport(${clientUrl}/arcTestnet, clientKey)`, display the counterfactual address, and send 0.1 USDC to a pasted address using `sendUserOperation` with `paymaster: true`. Show the userOp hash and link to testnet.arcscan.app.

*Check:* fund the smart account from faucet.circle.com, send, and see the transfer on the explorer. The user pays no gas.

### Task 4 — Spike: event indexing

> In a Node script under `scripts/`, subscribe over WebSocket to USDC `Transfer` events emitted by the system emitter address `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` and log decoded transfers. Confirm it catches the transfer from Task 3. Then confirm that subscribing to the token contract alone does NOT catch it, and note the result in a comment.

*Check:* your Task 3 transfer appears in the log.

### Task 5 — Spike: cross-browser passkeys

> Deploy the Task 3 spike to the staging subdomain. Test on Android Chrome and iOS Safari: register, hard-reload, re-authenticate, sign a second transfer. Document in `docs/passkey-notes.md` exactly what differs between the two.

*Check:* both browsers complete the full loop. This is the highest-risk unknown in the project — do not move past it on desktop results alone.

### Task 6 — Spike: PWA shell

> Add a web manifest, a service worker with an offline shell, an install prompt component, and Web Push registration with VAPID keys. Test install and a push on Android Chrome.

*Check:* the app installs to the home screen and receives a test push.

### Task 7 — Spike: crosschain funding

> Using Circle App Kit with the viem adapter, deposit USDC from Base Sepolia into Unified Balance and spend it on Arc Testnet.

*Check:* the balance appears and is spendable on Arc.

### Phase 0 gate

All seven done, spikes documented, scratch routes deleted. Then start Phase 1 from the implementation plan.

---

## 3. First Phase 1 task

> Implement `IdentityRegistry.sol` per the implementation plan: phone-hash and handle registration gated by a backend attestation signature, resolution views, and `updateAccount` for recovery. Phone numbers appear on-chain only as per-user salted hashes. Write Foundry tests covering: valid attestation registers, forged attestation reverts, duplicate handle reverts, handle validation fuzz, and account update preserves the identity. Deploy to Arc Testnet and record the address in `src/config/contracts.ts`.

---

## 4. Guardrails to repeat in prompts

Claude Code drifts on these over a long session. Re-state them when you start a new task:

- One balance, never two
- All money is `bigint` base units at 6 decimals; conversion only in `money.ts`
- Every userOp passes `paymaster: true`
- No onramp, no cNGN, no multi-asset list
- Indexer reads the system emitter, not the token contract
- No secret behind a `NEXT_PUBLIC_` prefix
- Stop and ask before anything involving mainnet

---

## 5. Kickoff prompt

Paste this into Claude Code to start:

> This is CrackPay — a MiniPay-style USD stablecoin wallet on Arc, shipped as a mobile-first web PWA. Read `CLAUDE.md` and `docs/implementation-plan.md` in full before doing anything. Then confirm back to me: the stack, the three hard scope exclusions, and the seven Arc gotchas — in your own words, so I know you have them. After that, start with Task 1 from `docs/setup.md` and stop when `pnpm dev` serves and `forge test` runs. Do not skip ahead to Phase 1.
