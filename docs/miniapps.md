# Mini Apps

This file is the internal design note. The documentation for outside developers
is published from `apps/web/public/developers/` and served at
`/developers` (index), `/developers/*.md`, `/developers/SKILL.md` and
`/developers/llms.txt`. Keep the two in step when behaviour changes.

A Mini App is a web app on its own origin that CrackPay loads in an iframe and
gives a wallet to. The first one is KashLink, added early to exercise the
wallet during testing; Discover, submission and review are still Phase 3.

## How it fits together

```
Mini App (iframe, its own origin)            CrackPay page
  src/lib/miniapp/sdk.ts                       components/MiniAppHost.tsx
  EIP-1193 provider  ── postMessage ──▶        lib/miniapp/bridge.ts   answers requests
  announced via EIP-6963                       lib/miniapp/policy.ts   decides what may be sent
                     ◀── postMessage ──        confirm sheet, then passkey, then sponsored userOp
```

- The Mini App includes `sdk.ts` (one dependency-free file) and calls
  `installCrackPayProvider({ hostOrigins })`. Inside CrackPay it gets an EIP-1193
  provider, also announced through EIP-6963 and set as `window.ethereum`. In an
  ordinary tab it gets `null` and behaves as it always did.
- The app is connected from the start: `eth_requestAccounts` returns the user's
  smart account with no prompt.
- `eth_sendTransaction` is checked against the app's policy, shown to the user in
  the CrackPay page, signed with their passkey, and sent as a sponsored userOp.
  The app gets back the transaction hash, or an error if the call reverted.

## Security model

- **Origins.** CrackPay only accepts messages from the app's iframe window and its
  registered origin, and only posts to that origin. The SDK does the same in
  reverse against its `hostOrigins` list.
- **CSP.** Each app's page may frame only that app's origin; no other page may frame anything.
- **Sandbox.** `allow-scripts allow-forms allow-popups allow-same-origin`. This
  differs from the implementation plan, which omits `allow-same-origin`. Without
  it the app has an opaque origin: `event.origin` is `"null"`, so origin checks
  cannot work, and the app has no storage. It is safe because the host refuses to
  load any app that shares CrackPay's own origin.
- **Policy.** Each app lists the contracts it may call. A token contract can be
  called for one thing only: approving one of those contracts. Transfers,
  approvals to anyone else, calls to unlisted contracts, contract creation and
  sends to the zero address are refused before the user is asked anything.
- **Prompts** render in the CrackPay page, never in the iframe. Amounts are rounded
  up, so a prompt never shows less than will leave the balance.
- **Keys** never leave the CrackPay page.
- **Kill switch.** Switching an app off in the admin removes it from the list, the
  route and the frame policy on the next request.

## Developer mode

Modelled on MiniPay. Settings → tap Version seven times → Developer settings →
Developer mode → Load test page. That opens `/apps/test?url=…`, which wraps the
URL as a Mini App with an **unrestricted** policy: any contract may be called.
What protects the user there is the prompt, which shows the raw contract address
and a "not reviewed" warning, plus the red bar on the frame.

- `/apps/test` is the only route whose CSP allows framing any HTTPS site (or
  localhost). The settings page opens it with a full page load, and the test bar
  leaves it with one, because a client-side navigation keeps the previous
  document's CSP.
- Listed apps are unaffected: `unrestricted` is never set in the registry, and a
  test asserts that.
- Before mainnet, decide whether Developer mode stays available there. Today it
  is safe mainly because the chain is a testnet.

## The SDK

There is one SDK, delivered three ways from one source file,
`packages/miniapp-sdk/src/provider.ts`:

| For | What | Built by |
|---|---|---|
| Developers with a bundler | npm package `@crackpay/miniapp-sdk` (`.`, `/viem`, `/react`) | `pnpm build` in `packages/miniapp-sdk` |
| Developers without one | `/miniapp-sdk.js`, a script tag | `pnpm build:sdk` in `apps/web` |
| The CrackPay host | `apps/web/src/lib/miniapp/sdk.ts` (protocol types and helpers) | `pnpm build:sdk` in `apps/web` |

Edit `provider.ts`, then run `pnpm build:sdk` in `apps/web`. Tests fail if the
host's copy or the hosted script has drifted, or if the package's chain and token
constants disagree with the wallet's own config.

The hosted script trusts the origin it was loaded from. The npm package trusts
`CRACKPAY_ORIGINS` in `packages/miniapp-sdk/src/index.ts`; add the production
domain there when it exists and release a new version.

The package is MIT licensed and published as `@crackpay/miniapp-sdk` under the
`crackpay` npm organisation (owner account `eagle1`; 0.1.0 on 2 October 2026).
To release: bump `version` in `packages/miniapp-sdk/package.json`, then run
`npm publish` in that folder. It runs typecheck, tests and build first, and the
account's 2FA asks for approval in the browser, so a person has to run it.

## Developer skills

`skills/` is a self-contained skills repository for AI coding assistants, laid
out like `circlefin/skills`: a Claude Code marketplace manifest at
`skills/.claude-plugin/marketplace.json` and one plugin, `plugins/crackpay`, with
six skills (build, SDK, transactions, test, list, port from MiniPay) and a
Vite + React starter under `build-crackpay-miniapp/assets/starter`.

Developers need it in a **public** repository to install it
(`npx skills add <owner>/<repo>` or `/plugin marketplace add <owner>/<repo>`).
This monorepo is private; the public copy is `crackedstudio/crackpay-skills`. Edit
the skills here, run `pnpm build:skills` in `apps/web` (regenerates
`skills/manifest.json` and the website's `/.well-known/agent-skills/`), then copy
`skills/` over the public repository's contents and push.

Discovery files, so every kind of agent can find them: Claude Code
(`.claude-plugin`), Cursor (`.cursor-plugin`), Codex (`.agents/plugins` and
`.codex-plugin`), a plain `manifest.json`, and the Agent Skills well-known index
on the website.

`apps/web/src/lib/miniapp/skills.test.ts` fails when the skills drift from the
wallet: addresses, chain ID, Developer mode steps, listing template, forwarded
RPC methods and the starter's SDK version. When the SDK version or the CrackPay
domain changes, update the skills and the single-file `/developers/SKILL.md`.

## Submissions

Developers submit a listing file at `/developers/submit`. It is validated by
`src/lib/miniapp/listing.ts` and stored in the Supabase table
`miniapp_submissions` with status `pending`. Nothing is listed automatically.
Review them at `/admin/submissions`.

Decisions recorded on 2 October 2026:
- Developer mode stays available on both testnet and mainnet.
- Test apps must be at a public HTTPS address (deployment, domain or tunnel).
- The docs use `crackpay.vercel.app` until the production domain is ready. When
  it is, replace that host across `apps/web/public/developers/` and tell listed
  developers to update their script tag.

## The registry and the admin

Listed Mini Apps live in the Supabase table `miniapps`, not in code. They are
managed at `/admin`, a separate area with its own sign-in and layout:

- **Mini Apps**: every app, live or off. Create, edit, switch on or off, delete.
- **Submissions**: listings developers sent in. "Create a Mini App from this"
  opens the form filled in from the submission; saving marks it approved.

An app is visible to users only when it is switched on and its network matches
this deployment. Changes take effect on the next request, with no deploy:

- `GET /api/miniapps` and `/api/miniapps/<id>` are what the wallet reads.
- `src/proxy.ts` sets the frame policy for `/apps/*` per request, so `/apps/<id>`
  may frame exactly that app's origin and only while it is on. If the registry
  cannot be read it fails closed and frames nothing.
- Every other route is limited to `frame-src 'self'` in `next.config.ts`.

Admin access is one shared password, `ADMIN_PASSWORD` (at least 16 characters),
checked in constant time, limited to ten attempts an hour per IP, and held as a
12-hour `SameSite=Strict` cookie. There are no per-person admin accounts or
audit trail yet; add those before more people need access.

`DEFAULT_MINI_APPS` in `src/config/miniapps.ts` is only what a local dev server
shows when Supabase is not configured.

## Not supported yet

- Message and typed-data signing (`personal_sign`, `eth_signTypedData_v4`). A smart
  account signs differently from an EOA and needs its own design.
- Batched calls (`wallet_sendCalls`). An app that needs approve-then-call sends two
  transactions and the user confirms each.
- The custom methods from the plan (`scanQrCode`, `requestContact`, `getExchangeRate`).
- Per-app spending caps on sponsorship.

## Running KashLink inside CrackPay locally

1. CrackPay: put the Circle client key and URL in `apps/web/.env.local`, then `pnpm dev` (port 3000).
2. KashLink: on its `crackpay-miniapp` branch, `npm run dev` (port 5191). In dev it
   trusts `http://localhost:3000` by default.
3. Open `http://localhost:3000/apps/kashlink`, sign in with a passkey, and fund the
   smart account from faucet.circle.com.
4. A KashLink claim link can be opened inside CrackPay by appending its fragment:
   `http://localhost:3000/apps/kashlink#<key>`.

For a deployed KashLink, set `NEXT_PUBLIC_MINIAPP_KASHLINK_URL` in CrackPay and
`VITE_CRACKPAY_ORIGINS` in KashLink to each other's origins.

## Adding another app

1. Add an entry to `src/config/miniapps.ts`: id, name, URL, and a policy listing the
   contracts it calls and the tokens it needs an allowance on.
2. In the app, copy in `sdk.ts` and call `installCrackPayProvider`.
