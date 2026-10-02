# Identity recovery

How a CrackPay identity (phone hash + handle) moves between accounts, and what
the backend must do to keep that safe. Contract: `contracts/src/IdentityRegistry.sol`.

## What recovery does and does not do

Recovery changes where a phone number and handle **resolve to**. It does not move
money. Funds in a lost account stay in that account; only Circle's passkey
recovery (a recovery key registered on the smart account itself) can reach them.
That is why recovery setup at onboarding stays mandatory: registry recovery is
the last resort for a user who lost their passkey and never set it up, so that
people paying their number stop sending to an account nobody controls.

## The three ways an identity moves

| Path | Who can start it | Wait | Use |
|---|---|---|---|
| Circle passkey recovery | User, with their recovery key | None | Lost passkey. Same account address, funds intact. Preferred. |
| Migration (`updateAccount` → `acceptAccount`) | The current account | None | User still has access and wants a new account. |
| Recovery (`initiateRecovery` → `finalizeRecovery`) | A new account holding a recovery attestation | 1–30 days, set at deploy | User lost the account entirely. |

## Recovery flow

1. The user proves control of the phone number to the backend again (OTP, plus
   whatever extra checks the backend's policy demands).
2. The backend signs a `Recovery(phoneHash, newAccount, nonce, deadline)`
   attestation with the **recovery key**, using `recoveryNonce(phoneHash)`.
3. The new account calls `initiateRecovery`. The registry emits `RecoveryInitiated`
   and starts the timelock. Nothing has moved.
4. During the timelock the current account, or the owner, can call `cancelRecovery`.
5. After the timelock, and within the following 7 days, the new account calls
   `finalizeRecovery`. The identity moves and `RecoveryFinalized` is emitted.

## Safeguards in the contract

- **Timelock.** No recovery takes effect in under a day. A user who still has
  their account has that long to cancel a recovery they did not ask for.
- **Separate key.** Recovery attestations are signed by `recoveryAttester`, which
  the contract forces to differ from the registration `attester`. Compromising
  the hot registration key cannot start a recovery.
- **Bound attestations.** Each one names the identity, the new account, a
  one-time nonce, a deadline, the chain and this contract. It cannot be replayed,
  reused after a cancel, or used by another account.
- **One at a time.** A second recovery cannot be started while one is pending.
- **Cancel by migration.** If the real user migrates during the timelock, the
  pending recovery is dropped.
- **Circuit breaker.** The owner can pause recovery (blocks start and finish, not
  cancel), cancel any single recovery, and rotate either attester key.

## What the backend must do

These are obligations, not suggestions. The contract's safety depends on them.

- **Notify on `RecoveryInitiated`.** Push, SMS and email to the current account's
  owner immediately, with a one-tap cancel. The timelock only protects users who
  hear about the attempt.
- **Keep the recovery key cold.** Separate storage from the registration key,
  ideally an HSM or KMS with its own access policy and an audit log of every
  signature.
- **Rate-limit attestations.** At most one live recovery attestation per identity,
  short deadlines (minutes), and a cool-down after a cancelled recovery.
- **Treat OTP alone as weak.** A SIM swap defeats it. For accounts above a balance
  or activity threshold, require a second factor before signing.
- **Make the owner a multisig** before mainnet. The owner can rotate both
  attesters and cancel recoveries, so it must not be a single key.

## Residual risk

If the recovery key is compromised **and** the victim does not see or act on the
notification within the timelock **and** the owner does not pause, an attacker
can take over an identity and receive that user's future incoming payments.
Existing funds are unaffected. The timelock length is the main lever: longer is
safer and slower for genuine recoveries. It is set at deploy
(`IDENTITY_RECOVERY_DELAY`) and adjustable by the owner between 1 and 30 days.
