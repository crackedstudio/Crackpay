---
name: list-crackpay-miniapp
description: Prepare a CrackPay Mini App for listing and write its listing file. Covers who lists apps (CrackPay's admins), the crackpay-listing.json format and its validation rules, listing requirements for the app and its contracts, where to submit, and what happens after. Use when the user wants to publish, list, submit or launch a CrackPay Mini App, get it onto the CrackPay Apps page, whitelist its URL or contracts, or asks about CrackPay listing requirements or review.
---

# Get a Mini App listed in CrackPay

CrackPay's admins decide which Mini Apps users can open. A developer cannot list
an app themselves. They **submit a listing file**; the team reviews it, enters
the app in CrackPay's registry, and switches it on.

What gets recorded for a listed app, and enforced from then on:

- **Its URL.** The app's page in CrackPay can show that site and no other.
- **Its contracts.** The app can send transactions to those and to nothing else.
- **Its token allowances.** Which tokens it may ask the user to approve, and only
  towards one of its own contracts.

So the listing file must be complete and exact. A contract left out is a
contract the app cannot call.

## Workflow

### 1. Check the app is ready

- [ ] Tested in Developer mode (`test-crackpay-miniapp`)
- [ ] Connects on load: no connect button, no sign-in signature
- [ ] Served over HTTPS at a stable public URL, and allows framing by CrackPay
- [ ] Works at 360 × 640, single column
- [ ] Every transaction fits the listed-app rules (`send-crackpay-transactions`):
      only its own contracts, token calls limited to `approve` of its own contract
- [ ] Cancelled, refused and failed transactions each show a clear message
- [ ] Name and logo make it obvious the app is the developer's, not CrackPay's
- [ ] Terms of Service, Privacy Policy and a support link are reachable in the app
- [ ] Dependencies pinned to exact versions, lockfile committed

### 2. Check the contracts

For every contract the app sends a transaction to:

- [ ] Source verified on the Arc explorer (`https://explorer.testnet.arc.io`)
- [ ] One sample transaction per user-facing function
- [ ] Works with smart accounts: no `tx.origin` checks, no "caller has no code" checks

Find the full set by searching the code for every address passed as `to` or
`address` to a write call. Reads do not need listing.

### 3. Write `crackpay-listing.json`

Create it in the project root from `references/listing-template.json`. Fill in
only what is true: do not invent a support link, a terms page or a contract
purpose. Ask the user for anything missing.

| Field | Rule |
|---|---|
| `name` | 2–40 characters |
| `tagline` | Up to 160 characters, one or two sentences |
| `publisher` | Up to 80 characters |
| `category` | One of `finance`, `shopping`, `utility`, `games`, `social`, `rewards`, `education`, `entertainment` |
| `url` | `https://`. Where the app loads from. One per listing. |
| `icon` | `https://`. Square PNG, 512 × 512. |
| `supportUrl` | `https://` or `mailto:` |
| `termsUrl`, `privacyUrl` | `https://` |
| `network` | `arc-testnet` or `arc-mainnet`. One listing per network. |
| `contracts` | Up to 20. Each: `address`, `name` (≤ 60), `purpose` (≤ 300), `explorerUrl` (`https://`), `sampleTransactions` (list of `https://` links, may be empty). No duplicates. |
| `tokenApprovals` | Subset of `["USDC", "EURC"]`. Needs at least one contract. Leave empty if the app only takes native USDC. |
| `origins` | Up to 30 `https://` origins the app loads scripts, styles or data from |

CrackPay runs on Arc Testnet today, so use `arc-testnet`. Mainnet listings are
reviewed once CrackPay is live on Arc Mainnet.

### 4. Submit

The user submits it, with an email address the team can reply to, at:

**`https://crackpay.vercel.app/developers/submit`**

The form validates the file and names the first field that is wrong. Do not
submit on the user's behalf.

### 5. After submitting

1. The team reviews the listing against the requirements.
2. The team tests the app in CrackPay.
3. Feedback, if something needs changing.
4. The team lists the app and it appears on the Apps page.

## After listing

- **A new URL or a new contract needs a new review.** Until it is approved,
  calls to the new contract are refused with `4100`. Plan contract upgrades
  accordingly, and tell the user before changing either.
- CrackPay can switch a listing off at any time, for example if the app
  misbehaves or a listed contract proves unsafe. It takes effect immediately.
- Critical issues are expected to be fixed within 24 hours.

## Common reasons for rejection

- A connect button, or a signature request on load
- A contract the app calls is missing from the listing, or not verified
- The app transfers tokens directly instead of through its own contract
- Amounts wrong by 10^12 (18-decimal and 6-decimal USDC mixed up)
- The server refuses to be framed
- Unusable at phone width
- Missing support, terms or privacy links
