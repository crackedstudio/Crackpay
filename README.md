# CrackPay

One place for your USDC. CrackPay is a self-custodial dollar wallet on
[Arc](https://arc.io), Circle's chain where USDC is the gas token. It runs as an
installable web app at **[www.crackpay.xyz](https://www.crackpay.xyz)**.

Users see one dollar balance, a Send button and a handle such as `@eagle`. They
never see a seed phrase, a gas token or a chain name. Each account is a passkey
smart account (ERC-4337) from Circle Modular Wallets, so the keys stay on the
user's device and the backend never holds signing authority over anyone's money.

## Status

| | |
|---|---|
| Network | **Arc mainnet** (chain `5042`) in production. Arc Testnet (`5042002`) for development. |
| IdentityRegistry | Mainnet [`0xB417597Eb5dd49b69f3a573ad73Fc8B528a16dcF`](https://explorer.arc.io/address/0xB417597Eb5dd49b69f3a573ad73Fc8B528a16dcF), testnet [`0x1c36829d1d82470bfb9FAd9bE264729c26753Ef7`](https://explorer.testnet.arc.io/address/0x1c36829d1d82470bfb9FAd9bE264729c26753Ef7). See [`contracts/deployments.md`](contracts/deployments.md). |
| Network fees | Normally sponsored by Circle Gas Station. While Circle's paymaster is paused, transactions fall back to the account paying its own fee in USDC (about a cent). |
| Audit | Not audited yet. The mainnet registry owner is still a single key; it moves to a multisig before a wider launch. |

Working today: passkey sign-up and sign-in, handles, one USDC balance, send by
handle, receive and payment requests, activity, deposits, and Mini Apps (for
example [KashLink](https://arc.kashlink.live)). Sending to a phone number is not
live yet.

## Repo layout

```
apps/web               The wallet: Next.js (App Router) PWA, deployed to www.crackpay.xyz
apps/site              Marketing site
packages/brand         Design system shared by both apps (tokens.css, Mark, icons, buttons)
packages/miniapp-sdk   @crackpay/miniapp-sdk on npm, for building Mini Apps
contracts              Foundry project: IdentityRegistry.sol, deploy script, tests
supabase/migrations    Postgres schema (users and handles, OTP, Mini Apps)
skills                 AI coding assistant skills for Mini App developers
docs                   Plan, design, backend, recovery and Mini App notes
```

## Stack

Next.js and TypeScript (strict), Tailwind, viem, Circle Modular Wallets and Gas
Station, Supabase, Solidity with Foundry and OpenZeppelin v5, hosted on Vercel.
The full rules (what to use, what not to add) are in [`CLAUDE.md`](CLAUDE.md).

## Getting started

Requires Node 22+, pnpm and, for contracts, Foundry.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill it in
pnpm dev          # wallet on http://localhost:3000
pnpm dev:site     # marketing site on http://localhost:3001
```

Passkeys only work on `localhost` or the domain registered in Circle Console.

### Choosing a network

The wallet builds for one network at a time:

```bash
NEXT_PUBLIC_ARC_NETWORK=mainnet   # or testnet (the default)
NEXT_PUBLIC_ARC_CHAIN_ID=5042     # 5042002 on testnet
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.mainnet.arc.io
```

Contract addresses for each network live in
[`apps/web/src/config/contracts.ts`](apps/web/src/config/contracts.ts), with
their source and date. Mainnet and testnet share one Supabase project; the
`users` and `miniapps` tables carry a `network` column so the two never mix.

`NEXT_PUBLIC_` variables are baked in at build time. After changing one in
Vercel, redeploy.

Every variable is described in
[`apps/web/.env.example`](apps/web/.env.example). Server secrets (attestation
key, phone pepper, Supabase service role, Circle API key) never get a
`NEXT_PUBLIC_` prefix.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
cd contracts && forge test
```

Database migrations are pushed with
`supabase db push --db-url "$SUPABASE_DB_URL"`.

## Building a Mini App

Mini Apps are web apps that open inside CrackPay and talk to the user's wallet
through an EIP-1193 provider. Start with:

```bash
npm install @crackpay/miniapp-sdk
```

- SDK docs: [`packages/miniapp-sdk/README.md`](packages/miniapp-sdk/README.md)
- Developer guide: [www.crackpay.xyz/developers](https://www.crackpay.xyz/developers)
- Assistant skills: [`skills/`](skills/README.md)

## Docs

- [`docs/implementation-plan.md`](docs/implementation-plan.md): scope and phases
- [`docs/design.md`](docs/design.md): product and visual design
- [`docs/backend.md`](docs/backend.md): API routes and data
- [`docs/identity-recovery.md`](docs/identity-recovery.md): handles and account recovery
- [`docs/miniapps.md`](docs/miniapps.md): the Mini App host and review
- [`docs/setup.md`](docs/setup.md): first-time setup

## Security

Report vulnerabilities privately to the maintainers rather than in a public
issue. Users' funds are controlled only by their passkeys; phone numbers are
stored as salted hashes and never go on chain.

## License

[MIT](LICENSE) © 2026 Cracked Studios
