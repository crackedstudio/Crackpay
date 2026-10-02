# Get listed

CrackPay decides which Mini Apps its users can open. For each listed app the
team records **the URL it loads from** and **the contracts it may call**. A
listed app that tries to call anything else is refused.

Test in [Developer mode](./test-in-crackpay.md) first. Submit when it works.

## What to send

Send the CrackPay team a listing file like this.

```json
{
  "name": "KashLink",
  "tagline": "Send USDC or EURC as a link.",
  "publisher": "Cracked Studios",
  "category": "finance",
  "url": "https://arc.kashlink.live/",
  "icon": "https://arc.kashlink.live/icon-512.png",
  "supportUrl": "https://t.me/your-support",
  "termsUrl": "https://arc.kashlink.live/terms",
  "privacyUrl": "https://arc.kashlink.live/privacy",
  "network": "arc-testnet",
  "contracts": [
    {
      "address": "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62",
      "name": "KashLinkEscrow",
      "purpose": "Holds the funds for each link until it is claimed or refunded.",
      "explorerUrl": "https://explorer.testnet.arc.io/address/0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62",
      "sampleTransactions": ["https://explorer.testnet.arc.io/tx/0x…"]
    }
  ],
  "tokenApprovals": ["EURC"],
  "origins": ["https://arc.kashlink.live", "https://your-api.example.com"]
}
```

| Field | Notes |
|---|---|
| `name`, `tagline` | Shown on the Apps page. Tagline is one or two sentences. |
| `publisher` | You or your organisation. |
| `category` | One of: finance, shopping, utility, games, social, rewards, education, entertainment. |
| `url` | Where the app loads from. HTTPS, publicly reachable. One URL per listing. |
| `icon` | Square PNG, 512 × 512. |
| `supportUrl` | How users reach you. Must also be linked inside the app. |
| `termsUrl`, `privacyUrl` | Must also be linked inside the app. |
| `network` | `arc-testnet` today. |
| `contracts` | Every contract your app sends transactions to. Nothing else will be callable. |
| `tokenApprovals` | Tokens (`USDC`, `EURC`) your contracts need an allowance on. Leave empty if you only take native USDC. |
| `origins` | Every origin your app loads scripts, styles or data from. |

## Requirements

### Technical

- **Connects on load.** No connect button and no sign-in signature.
- **Served over HTTPS** and allows framing by CrackPay.
- **Works at 360 × 640.** Single column, no horizontal scroll.
- **Handles errors.** Cancelled, refused and failed transactions each show a
  clear message.
- **Runs on Arc.** Uses 6-decimal USDC amounts correctly; see [Transactions](./transactions.md).
- **Fast.** Include a [PageSpeed Insights](https://pagespeed.web.dev/) result for your URL.

### Contracts

- **Verified source** on the Arc explorer for every listed contract.
- **A sample transaction** for each function users can trigger.
- **Works with smart accounts.** No `tx.origin` checks and no "caller has no
  code" checks; see [Wallet connection](./wallet-connection.md).
- **Token calls fit the rule.** Your app only ever asks a token contract to
  approve one of your listed contracts.

### Ownership and support

- Your name and logo are clearly shown. It must be obvious the app is yours and
  not CrackPay's.
- Terms of Service, Privacy Policy and a support link are reachable in the app.
- You fix critical issues within 24 hours. A listing with an unresolved
  critical issue may be switched off until it is fixed.

### Dependencies

- Pin exact dependency versions and commit your lockfile.
- Do not install a package version published in the last 7 days.

## After you submit

1. **Review.** The team checks the listing against these requirements.
2. **Testing.** The team runs your app in CrackPay.
3. **Feedback**, if anything needs changing.
4. **Listing.** Your URL and contracts are added, and the app appears on the Apps page.

## After you are listed

- **Changing your URL or adding a contract needs a new review.** Until it is
  approved, calls to the new contract are refused.
- CrackPay can switch a listing off at any time, for example if the app starts
  misbehaving or a listed contract is found to be unsafe.

## Common reasons for rejection

- A connect button, or a signature request on load
- A contract the app calls is missing from the listing, or is not verified
- The app transfers tokens directly instead of through its own contract
- Amounts wrong by a factor of 10¹² (18-decimal and 6-decimal USDC mixed up)
- The server refuses to be framed
- Unusable at phone width
