# CrackPay — Implementation Plan

**A MiniPay-class stablecoin wallet built on Arc**

**Chain:** Arc (Circle's L1, USDC as native gas)
**Target:** Arc Testnet → Arc Mainnet
**Platform:** Web first — installable mobile-web PWA. Native apps come later.
**Owner:** Onanike Samuel / Cracked Studios
**Status:** Draft v0.3
**Date:** 2 October 2026

---

## 1. What CrackPay Is

CrackPay is a self-custodial, mobile-first dollar stablecoin wallet, shipped as a web app. The MVP targets feature parity with MiniPay — the same jobs, the same "sending money should feel like sending a text" bar — but built on Arc, where USDC is the native gas token.

MiniPay's own framing, for reference: a self-custodial stablecoin wallet where every wallet is a verified phone number, transfers settle in seconds, fees are sub-cent, and users can send, swap, hold, earn and spend without ever touching a volatile gas token. It runs on Celo with ~20M activated wallets. CrackPay is the same product shape on different rails.

### Why Arc instead of Celo

| | Celo (MiniPay) | Arc (CrackPay) |
|---|---|---|
| Gas token | CELO, with fee-currency adapters for stablecoins | USDC natively — no adapter layer |
| Finality | ~1s block time | Sub-second deterministic finality |
| Stablecoin stack | Mento + third parties | Circle first-party: Wallets, Gas Station, CCTP, Gateway |
| Crosschain | Bridges | CCTP + Unified Balance built into App Kit |
| Account model | EOA + Valora-style accounts | ERC-4337 smart accounts (Modular Wallets) out of the box |

The trade: Arc is newer, thinner on third-party tooling, and the local-rails ecosystem MiniPay enjoys in Africa does not exist there yet.

### Explicitly out of scope

- **Fiat onramp / "buy stablecoins" flow.** Not in this plan at any phase.
- **cNGN or any local-currency stablecoin.** CrackPay is USD-denominated (USDC, with EURC optional).

Users fund CrackPay by receiving from someone else, bridging USDC in from another chain, or claiming a Cash Link.

### Platform decision: web first

CrackPay v1 is a single responsive web app (an installable PWA), not a native binary. This is deliberate:

- **Cash Links want the web.** A claim link should open and work in any browser with no install step. That is the acquisition loop, and an install wall in front of it kills it.
- **Passkeys work in the browser.** WebAuthn is supported in Chrome on Android and Safari on iOS, and Circle's Modular Wallets Web SDK is built around exactly this flow. Biometric signing does not require a native app.
- **Mini Apps are web apps already.** Hosting them in an iframe is simpler than building a native WebView bridge, and the provider injection model is the same either way.
- **Shipping speed.** One codebase, instant updates, no store review. The work is not thrown away later — a native shell can wrap the same app, and the contracts, backend and SDK integration carry over untouched.

What web costs us, and what we do about it:

| Web limitation | Mitigation now | Fixed by native later |
|---|---|---|
| No device contact list | Manual entry, QR, share-sheet invites, handles | Contacts permission |
| Push notifications weaker on iOS | Web Push on Android; email/SMS fallback | Native push |
| No camera without permission prompt | `getUserMedia` QR scanner (works, just prompts) | Native camera |
| Users must remember to open a URL | PWA install prompt, home-screen icon | App store presence |
| Passkeys tied to browser/platform keychain | Mandatory recovery setup | Same |

Design every screen at 360–420px first. The desktop layout is a centered column, not a dashboard.

---

## 2. Feature Parity Map

MiniPay's full surface, mapped to what CrackPay builds and with what.

| # | MiniPay feature | CrackPay equivalent | Built with | Phase |
|---|---|---|---|---|
| 1 | Phone-number wallet identity | Phone/handle → address resolution | `IdentityRegistry` contract + backend verification | 1 |
| 2 | Send to a contact in seconds | Send flow with in-app recents/saved contacts + QR | App Kit Send / userOp transfer | 1 |
| 3 | Biometric transaction approval | Passkey (WebAuthn) signing in the browser | Circle Modular Wallets Web SDK | 1 |
| 4 | No gas token to manage | Sponsored userOps | Circle Gas Station paymaster | 1 |
| 5 | Cloud backup & restore | Passkey + encrypted recovery backup | Circle passkey recovery, Google Drive app-data | 1 |
| 6 | Sub-cent fees | Arc fee model; show fee in USDC | Arc native | 1 |
| 7 | Drag-and-swap Pockets | Pockets UI across USDC / EURC / other Arc stables | App Kit Swap | 2 |
| 8 | Hold & Earn rewards | Savings pocket with vault yield | App Kit Earn | 2 |
| 9 | Cash Links | Claimable link-based transfers | `CashLink` escrow contract + deep links | 2 |
| 10 | Send Internationally | Send to any CrackPay user worldwide; recipient holds USD | Core send + identity | 1–2 |
| 11 | Travel Wallet | Spend abroad without FX loss; card + multi-chain balance | Unified Balance + card partner | 3–4 |
| 12 | Multi-chain funding | Deposit USDC from Base, Ethereum, Solana, etc. | App Kit Unified Balance / Bridge (CCTP) | 2 |
| 13 | Mini Apps | Sandboxed iframe host with injected EIP-1193 provider, Discover page, Mini App SDK | iframe + postMessage bridge | 3 |
| 14 | Virtual USD/EUR accounts | Named account details for inbound transfers | Licensed partner (BaaS) | 4 |
| 15 | Virtual card | Spend balance at merchants online/offline | Card issuing partner | 4 |
| 16 | Withdraw to local currency | Offramp to bank / mobile money | Third-party offramp partner | 4 |

Items 14–16 are partner-dependent and gated on licensing. They stay in the roadmap, but nothing in the MVP blocks on them.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ CrackPay web app (Next.js PWA, mobile-web first)               │
│  - Passkey auth (Circle Modular Wallets Web SDK, WebAuthn)     │
│  - viem + wagmi (Arc chains)                                   │
│  - App Kit: Send, Swap, Unified Balance, Bridge, Earn          │
│  - Phone/handle lookup, QR scan (getUserMedia) + generate      │
│  - Mini App iframe host with postMessage provider (phase 3)    │
│  - Service worker: offline shell, install prompt, Web Push     │
└───────────────┬──────────────────────────────┬─────────────────┘
                │ userOps                      │ REST / realtime
                ▼                              ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│ Circle infrastructure     │   │ CrackPay backend (Supabase)  │
│  - Bundler + Gas Station  │   │  - Phone verification (OTP)  │
│  - CCTP / Gateway         │   │  - Identity index + cache    │
│  - Modular Wallets        │   │  - Cash Link registry        │
└───────────────┬───────────┘   │  - Tx indexer + notifications│
                │               │  - Mini App directory        │
                ▼               └───────────────┬──────────────┘
┌───────────────────────────────────────────────▼──────────────┐
│ Arc                                                           │
│  - USDC (native gas + ERC-20), EURC                           │
│  - User smart accounts (MSCA)                                 │
│  - CrackPay contracts: IdentityRegistry, CashLink,            │
│    PaymentRouter                                              │
│  - Earn vaults                                                │
└───────────────────────────────────────────────────────────────┘
```

### Stack

- **Frontend:** Next.js (App Router) as an installable PWA — service worker, web manifest, offline shell. Tailwind for styling. Deployed on Vercel. Designed at phone width first.
- **Web3:** viem, wagmi, `@circle-fin/modular-wallets-core` (Web SDK), Circle App Kit with the viem adapter.
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime) — same stack pattern as Remesso.
- **Contracts:** Solidity + Foundry.
- **Indexing:** Arc WebSocket RPC listener → Postgres, plus a managed indexer if throughput demands it.
- **Notifications:** Web Push (VAPID) where supported, with SMS/email fallback.

### Network configuration (testnet)

| Parameter | Value |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` (alts: dRPC, QuickNode, Blockdaemon, Alchemy) |
| WebSocket | `wss://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| viem chain | `import { arcTestnet } from "viem/chains"` |
| Modular Wallets transport | `${clientUrl}/arcTestnet` |

Pull USDC, EURC, CCTP and Gateway addresses from Arc's official Contract Addresses page. Do not copy them from blog posts — some community guides also circulate chain ID `1516`, which is wrong.

---

## 4. Arc Engineering Constraints

Read before writing any balance, history or transfer code.

1. **Decimals differ by interface.** Native USDC (the gas balance) uses 18 decimals. The ERC-20 USDC interface uses 6 — Circle's Modular Wallets examples use `parseUnits(amount, 6)`. Standardize internally on 6-decimal base units and convert at the edges. Write a dedicated test suite for this.
2. **Show one balance.** Native and ERC-20 USDC are the same balance. Never render two rows.
3. **Transfer events come from a system emitter.** A system address (`0xffff…fFfE`) logs all USDC `Transfer` events. The indexer must subscribe there, not only to the token contract.
4. **Fee floor.** The mempool enforces a 20 Gwei `maxFeePerGas` floor. Clamp fee estimation accordingly.
5. **Blocklist reverts burn gas with no receipt.** Model "submitted, no receipt" as its own terminal state in the UI.
6. **`address(0)` transfers revert.** Validate recipients client-side before building the userOp.
7. **Finality is sub-second.** No confirmation counter, no pending spinner beyond the round trip. The UI should say "Sent" almost immediately.

---

## 5. Smart Contracts

### 5.1 `IdentityRegistry`

Maps a verified phone number hash and/or handle to a smart account address. This is the single most important contract — it's what makes "send with just a phone number" work.

```solidity
function register(bytes32 phoneHash, string calldata handle) external;
function resolvePhone(bytes32 phoneHash) external view returns (address);
function resolveHandle(string calldata handle) external view returns (address);
function reverse(address account) external view returns (string memory handle);
function updateAccount(address newAccount) external;  // recovery / migration
```

- Phone numbers are stored only as salted hashes on-chain. The salt lives server-side; plaintext numbers never go on-chain.
- Registration is gated by a backend attestation (signed OTP verification) so people can't claim numbers they don't own.
- Registration is sponsored, so onboarding is free to the user.
- A privacy note: a global salt makes the registry enumerable by anyone with a phone-number list. Use a per-user salt with a server-side lookup index, and treat resolution as a rate-limited backend API rather than a public on-chain read.

### 5.2 `CashLink`

Escrow for "send money as a link" — the sender locks funds, anyone with the link claims them, the sender can reclaim after expiry.

```solidity
function create(bytes32 claimHash, uint256 amount, uint64 expiry) external returns (uint256 id);
function claim(uint256 id, bytes calldata secret, address recipient) external;
function reclaim(uint256 id) external;  // sender only, after expiry
```

- The link encodes a secret; `claimHash = keccak256(secret)`. The chain never sees the secret until claim.
- Claims are paymaster-sponsored so a brand-new user with zero balance can claim.
- Claiming also triggers wallet creation for users who don't have one yet — this is the main viral loop.

### 5.3 `PaymentRouter` (phase 2)

Merchant payments with reconciliation metadata.

```solidity
function pay(address merchant, uint256 amount, bytes32 invoiceId) external;
// emits PaymentMade(payer, merchant, amount, invoiceId)
```

### Contract checklist

- [ ] Foundry project; Arc Testnet in `foundry.toml`
- [ ] `IdentityRegistry` + attestation signature verification + fuzz tests on handle validation
- [ ] `CashLink` + tests covering double-claim, expiry race, reclaim-after-claim
- [ ] `PaymentRouter` + tests
- [ ] Deploy and verify on Arc Testnet
- [ ] External security review before mainnet

---

## 6. Backend

### Data model

| Table | Fields |
|---|---|
| `users` | id, smart_account, phone_hash, handle, country, created_at, recovery_status |
| `phone_index` | phone_hash, salt_ref, user_id (rate-limited lookup only) |
| `contacts` | user_id, contact_user_id, nickname, last_sent_at |
| `cash_links` | id, chain_id, creator_id, amount, status, expiry, claimed_by, claimed_at |
| `transactions` | tx_hash, user_id, counterparty, amount, token, type, invoice_id, block_time |
| `merchants` | id, owner_id, name, payout_address, category |
| `mini_apps` | id, name, url, category, icon, status, reviewed_at |
| `earn_positions` | user_id, vault, shares, last_synced |

### Services

- **Phone verification:** OTP via an SMS provider, then issue a signed attestation the client submits to `IdentityRegistry`.
- **Resolution API:** rate-limited phone/handle → address lookup. Never bulk-resolvable.
- **Indexer:** subscribe to Arc logs (including the USDC system emitter and CrackPay contract events), write to `transactions`, push notifications on inbound funds and Cash Link claims.
- **Cash Link service:** link generation, short URLs, claim deep links, expiry sweeper.
- **Mini App directory:** submission, review, and the Discover feed.
- **Compliance screening:** address screening above configurable thresholds.

---

## 7. Client Surface

### Screens

1. **Onboarding** — phone number → OTP → passkey creation → handle. No seed phrase shown, ever. Followed by an "Add to home screen" prompt.
2. **Home** — single USD balance, Send / Request / Scan / Cash Link, recent activity, Earn teaser.
3. **Send** — recents and saved contacts (entered in-app, no device contact access on web), handle, phone, address or QR → amount → biometric confirm → done.
4. **Receive** — QR, handle, phone number, share sheet.
5. **Cash Link** — create (amount, expiry, optional note) → share link; claim screen for recipients.
6. **Pockets** — drag-and-drop swap between stablecoin pockets.
7. **Earn** — savings pocket, APY, deposit/withdraw with preview, position history.
8. **Add funds** — receive from a contact, or bridge in from another chain (Unified Balance).
9. **Activity** — filterable history, receipts, export.
10. **Discover** — Mini Apps directory (phase 3).
11. **Settings** — recovery, security, handle, display currency, support.

### QR / link format

Everything is an HTTPS URL, so links open anywhere without a custom scheme or an installed app:

```
https://crackpay.app/pay?to=<handle|address|phone>&amount=<decimal>&invoice=<id>&memo=<text>
https://crackpay.app/claim/<linkId>#<secret>     ← Cash Link (secret in fragment, never sent to server)
```

QR codes encode the same URLs, so any phone camera can read one and land on the right screen. Also parse plain `0x…` addresses and EIP-681 URIs for interoperability with other wallets. A `crackpay://` scheme gets added alongside these when native apps ship.

### Mini Apps (phase 3)

Mirror MiniPay's developer model so existing Mini App builders can port with minimal changes. On web the host is a sandboxed iframe rather than a native WebView:

- The Mini App loads from its own HTTPS origin inside `<iframe sandbox="allow-scripts allow-forms allow-popups">`.
- CrackPay injects an EIP-1193 provider shim into the frame; the shim relays requests to the parent over `postMessage`, and the parent signs with the user's passkey. The Mini App's own origin never sees keys.
- Strict origin checks on every message, in both directions. A Content Security Policy `frame-src` allowlist gates which apps can load at all.
- Auto-connect on load — no "Connect wallet" button inside Mini Apps.
- Arc Mainnet + Arc Testnet are the only chains exposed.
- Custom methods matching MiniPay's: `scanQrCode`, `requestContact`, `getExchangeRate`, phone lookup. Each prompts the user in the parent frame, never inside the iframe.
- A review queue before anything appears on Discover, plus a per-app kill switch.

### Core flow: send to a phone number

1. Hash the recipient's number (server-side salt) → resolve to an address via the rate-limited API.
2. If unregistered, offer to send a Cash Link instead — the recipient claims it and gets a wallet in the process.
3. Build the transfer: `encodeTransfer(recipient, USDC, parseUnits(amount, 6))`.
4. `bundlerClient.sendUserOperation({ calls: [...], paymaster: true })` → biometric prompt.
5. Receipt returns sub-second → success screen, optimistic activity row.
6. Indexer reconciles and notifies the recipient.

---

## 8. Delivery Phases

### Phase 0 — Spikes (week 1)

- [ ] Circle Console: client key, passkey domain (your production domain), client URL for `arcTestnet`
- [ ] Spike: passkey wallet creation + sponsored USDC transfer on Arc Testnet, in a browser
- [ ] Spike: read USDC `Transfer` events via the system emitter
- [ ] Spike: Unified Balance deposit from Base Sepolia, spend on Arc
- [ ] Spike: WebAuthn passkey registration and signing on Android Chrome and iOS Safari, including a reload-and-reauthenticate pass
- [ ] Spike: PWA install prompt + Web Push on Android
- [ ] Confirm Arc mainnet status and Gas Station mainnet support on Arc
- [ ] Register the production domain early — the passkey domain is baked into credentials and changing it later invalidates them

**Exit:** every spike green on testnet.

### Phase 1 — Core wallet MVP (weeks 2–5)

Features 1–6, 10 from the parity map.

- [ ] Phone OTP + attestation + `IdentityRegistry` registration
- [ ] Passkey onboarding, zero seed phrases
- [ ] Home balance (one row), receive QR
- [ ] Send to contact / handle / phone / address / QR
- [ ] Activity feed from the indexer
- [ ] Recovery setup with a nag until complete
- [ ] PWA: manifest, service worker, offline shell, install prompt
- [ ] Push notifications on inbound funds (Web Push + fallback)

**Exit:** two new users onboard and pay each other in under 60 seconds, start to finish, on a phone browser.

### Phase 2 — Parity features (weeks 6–9)

Features 7, 8, 9, 12.

- [ ] Cash Links: create, share, claim (including claim-creates-wallet)
- [ ] Pockets swap UI
- [ ] Earn: vault discovery, deposit/withdraw with preview, position view
- [ ] Unified Balance crosschain funding
- [ ] Merchant payments + `PaymentRouter` + invoice QR
- [ ] Payment requests

**Exit:** a pilot cohort of 20+ users transacts for two weeks without support intervention.

### Phase 3 — Mini Apps platform (weeks 10–13)

Feature 13.

- [ ] Mini App iframe host + provider shim + postMessage bridge + origin checks
- [ ] Custom RPC methods (QR scan, contact request, exchange rate)
- [ ] Discover page, submission flow, review queue
- [ ] Developer docs + a starter template
- [ ] Two to three launch Mini Apps (airtime/data, bills, savings) with partners

### Phase 4 — Partner rails & mainnet (weeks 14–20)

Features 11, 14, 15, 16.

- [ ] Contract audit
- [ ] Gas Station mainnet policy with per-user sponsorship caps
- [ ] KYC tiers + compliance vendor integration
- [ ] Offramp partner (bank / mobile money withdrawal)
- [ ] Virtual account partner (USD/EUR account details)
- [ ] Card issuing partner (Travel Wallet + Virtual Card)
- [ ] Switch transports and chain config from testnet to mainnet
- [ ] Closed beta → public launch
- [ ] (Optional, post-launch) Native shells wrapping the same app — Capacitor or a thin React Native WebView — for store presence, native push and device contacts

Timeline assumes one full-time developer plus part-time design. For a hackathon, scope to Phase 0 + the send flow and Cash Links from Phase 2 — that demo alone shows the product, and a web build means judges can try it from a link.

---

## 9. Security

- **Custody:** users hold passkeys. The backend has no signing authority over user funds, ever.
- **Recovery:** mandatory setup before balance exceeds a low threshold. Test the full lost-device path before launch.
- **Phone privacy:** per-user salted hashes, rate-limited resolution, no bulk enumeration, no plaintext numbers on-chain.
- **Paymaster abuse:** per-user and global sponsorship caps; only sponsor calls to allowlisted targets (USDC, CrackPay contracts, Earn vaults). Cash Link claims are the highest-risk sponsored path — cap claims per device and per IP.
- **Cash Link security:** the secret lives in the URL fragment and never reaches the server. Short expiry by default, reclaimable by the sender.
- **Mini App sandboxing:** iframe `sandbox` attribute, CSP `frame-src` allowlist, strict `postMessage` origin checks, no access to keys, and every sensitive prompt rendered by the parent frame. Review before listing, kill switch per app.
- **Regulatory:** holding and transferring USDC for Nigerian users has licensing implications, and that sharpens considerably once card, virtual account or offramp partners enter in Phase 4. Get legal advice before mainnet; use licensed partners rather than building those rails in-house.

---

## 10. Testing

- **Contracts:** Foundry unit + fuzz + fork tests against Arc Testnet.
- **Decimals:** dedicated suite for 18 ↔ 6 conversion, rounding and display.
- **E2E:** Playwright with a virtual authenticator for passkey flows.
- **Cross-browser:** every release tested on Android Chrome and iOS Safari, both installed as a PWA and in a plain browser tab. Passkey behavior differs between them.
- **Failure modes:** paymaster rejection, bundler timeout, blocklist revert, bridge failure, Cash Link double-claim, OTP replay, passkey unavailable or declined, service worker serving stale assets.
- **Pilot:** 20+ real users on testnet, including at least five first-time crypto users, before any mainnet funds.

---

## 11. Success Metrics

| Metric | MVP target |
|---|---|
| Onboarding completion (install → funded wallet) | > 70% |
| Time to first successful send | < 90 s from landing on the site |
| PWA install rate among onboarded users | > 40% |
| Send flow completion time | < 10 s |
| Cash Link claim rate | > 60% of links created |
| Recovery setup rate among funded users | > 60% |
| Failed transaction rate | < 2% |
| Weekly active senders / funded users | > 30% |

---

## 12. Risks & Open Questions

| Risk / question | Response |
|---|---|
| Arc mainnet timing and Gas Station mainnet support on Arc | Verify in Phase 0; keep chain config swappable |
| No funding path without an onramp | Cash Links and crosschain deposits carry Phase 1–2; revisit funding before public launch |
| Distribution — MiniPay rides inside Opera Mini, CrackPay has no host browser | Cash Links as the viral loop; merchant and community seeding; Remesso as a possible first channel |
| Phone registry privacy and enumeration | Per-user salts + rate-limited server resolution; audit before launch |
| Paymaster cost at scale | Model cost per user per month early; caps from day one |
| Partner availability for card / virtual accounts / offramp in Nigeria | Start conversations in Phase 2, well before Phase 4 needs them |
| Passkey support varies across Android Chrome and iOS Safari | Test both in Phase 0; mandatory recovery setup covers the gaps |
| Retention is harder on web than in an installed app | PWA install prompt at the end of onboarding; Web Push on Android; native shell post-launch |
| Changing the production domain later invalidates existing passkeys | Lock the domain in Phase 0, before any real user registers |

---

## 13. References

- Arc docs: https://docs.arc.io (index: https://docs.arc.io/llms.txt) — EVM differences, Contract Addresses, Gas and Fees, Connect to Arc, Account Abstraction
- App Kit: Send, Swap, Bridge, Unified Balance, Earn
- Circle Modular Wallets: https://developers.circle.com/wallets/modular — passkey accounts, Gas Station sponsorship, recovery
- Circle skills for AI-assisted development: `circlefin/skills` (`use-arc`, `use-modular-wallets`)
- MiniPay product reference: https://minipay.to
- MiniPay Mini Apps developer model: https://docs.minipay.xyz
