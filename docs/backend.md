# Backend

The identity backend runs as Next.js route handlers in `apps/web/src/app/api`,
with Supabase Postgres for storage. This differs from the repo layout in
`CLAUDE.md`, which anticipated Supabase Edge Functions: the secrets it needs
(`ATTESTATION_SIGNER_KEY`, `PHONE_HASH_PEPPER`) were already specified as
`apps/web` server variables in `setup.md`, and Node route handlers share viem and
the typed-data definitions with the client. The logic lives in
`src/lib/server/identity-service.ts` and does not depend on Next, so it can move.

## Sign-up flow

1. `POST /api/otp/start {phone}` — sends a 6-digit code. Limits: 5 per number and 20 per IP, per hour.
2. `POST /api/otp/verify {challengeId, code}` — 5 attempts, 10 minutes. A new number gets a
   15-minute `cp_phone` cookie; a number that already has an account gets a session.
3. `GET /api/handles/:handle` — availability, read from the chain.
4. The client creates the passkey, with the handle as its label.
5. `POST /api/identity/attest {account, handle}` — returns the EIP-712 attestation.
6. The client sends `IdentityRegistry.register(...)` as a sponsored userOp.
7. `POST /api/identity/confirm` — checks the chain, marks the user registered, starts a 30-day `cp_session`.

Afterwards `POST /api/resolve {phone}` turns a number into an account for signed-in
users: one number per call, 30 per user per hour.

Handle is chosen before the passkey, the reverse of the plan's order, so the
passkey can be labelled with the handle. The alternative was labelling it with the
phone number, which would send the number to Circle.

## Phone privacy

The number itself is never stored. The database holds `phone_lookup` =
HMAC(pepper, number), which lets the server find a user, and `phone_hash` =
keccak256(salt ‖ phone_lookup) with a random per-user salt, which is what goes
on-chain. Matching the registry against a list of numbers needs the pepper and
every user's salt.

## Configuration

| Variable | Purpose |
|---|---|
| `ATTESTATION_SIGNER_KEY` | Private key of the registry's `attester` address. Required. |
| `PHONE_HASH_PEPPER` | Keys `phone_lookup`. Changing it orphans every existing user. |
| `SESSION_SECRET` | Signs cookies and OTP hashes. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database. |

Apply the schema with `supabase link --project-ref <ref>` then `supabase db push`
from the repo root. All tables have row level security on with no policies: only
the service role can touch them.

## Development fallbacks

Both are refused when `NODE_ENV` is `production`.

- **No Supabase configured:** an in-memory store. Everything in it is lost when the
  dev server restarts, while on-chain registrations are not, so a number registered
  before a restart cannot register again afterwards. Use a fresh number, or configure Supabase.
- **No SMS provider:** the code is printed to the server log as `[dev sms] …`. No
  provider is integrated yet.

## Not built yet

- A real SMS provider.
- Signing in by proving control of the account. Today a session comes from phone OTP.
- The transfer indexer. Activity reads the Arc explorer's API in the meantime, which
  misses plain native sends from other wallets.
- Recovery attestations (`initiateRecovery`) and the notifications that go with them.
