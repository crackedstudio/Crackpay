import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { isAddressEqual, zeroAddress, type Account, type Address, type Hex } from "viem";
import { IDENTITY_DOMAIN_NAME, IDENTITY_DOMAIN_VERSION, registrationTypes } from "../../config/identity";
import { isValidHandle } from "../handle";
import { ApiError } from "./errors";
import { newSalt, normalizePhone, phoneHash, phoneLookup } from "./phone";
import type { CodeVerifier, SmsSender } from "./sms";
import type { Store, User } from "./store";

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const ATTESTATION_TTL_SECONDS = 10 * 60;

/** What the registry says on-chain. Injected so the service can be tested without a node. */
export interface RegistryReader {
  resolveHandle(handle: string): Promise<Address>;
  resolvePhone(hash: Hex): Promise<Address>;
}

export type IdentityDeps = {
  store: Store;
  /** Sends codes CrackPay generates itself. Used only when there is no `verifier`. */
  sms: SmsSender;
  /** When set, this service generates, delivers and checks codes instead. */
  verifier?: CodeVerifier;
  registry: RegistryReader;
  /** Signs registration attestations. Its address is the registry's `attester`. */
  attester: Account;
  chainId: number;
  registryAddress: Address;
  /** PHONE_HASH_PEPPER. */
  pepper: string;
  /** Keys OTP code hashes. */
  secret: string;
  now(): number;
  /** Overridable for tests; defaults to a random 6-digit code. */
  generateCode?(): string;
};

const tooMany = () => new ApiError(429, "rate_limited", "Too many attempts. Wait a while and try again.");

const codeHash = (secret: string, challengeId: string, code: string) =>
  createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("hex");

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Sends a one-time code to `phoneInput` and returns the challenge to verify it against. */
export async function startOtp(deps: IdentityDeps, phoneInput: string, ip: string): Promise<{ challengeId: string }> {
  const phone = normalizePhone(phoneInput);
  const lookup = phoneLookup(deps.pepper, phone);

  // Per number: stops one phone being flooded. Per IP: stops one caller spraying many.
  if (!(await deps.store.hit(`otp:phone:${lookup}`, 60 * 60, 5))) throw tooMany();
  if (!(await deps.store.hit(`otp:ip:${ip}`, 60 * 60, 20))) throw tooMany();

  const challengeId = crypto.randomUUID();
  const expiresAt = deps.now() + OTP_TTL_SECONDS * 1000;

  if (deps.verifier) {
    const providerRef = await deps.verifier.start(phone);
    await deps.store.createChallenge({ id: challengeId, phoneLookup: lookup, codeHash: null, providerRef, expiresAt });
    return { challengeId };
  }

  const code = deps.generateCode?.() ?? randomInt(0, 1_000_000).toString().padStart(6, "0");
  await deps.store.createChallenge({
    id: challengeId,
    phoneLookup: lookup,
    codeHash: codeHash(deps.secret, challengeId, code),
    providerRef: null,
    expiresAt,
  });
  await deps.sms.send(phone, `Your CrackPay code is ${code}. It expires in 10 minutes. Never share it.`);
  return { challengeId };
}

export type VerifiedPhone = { phoneLookup: Hex; user: User | null };

/** Checks a code. Each challenge allows a few attempts and succeeds at most once. */
export async function verifyOtp(deps: IdentityDeps, challengeId: string, code: string): Promise<VerifiedPhone> {
  const invalid = new ApiError(400, "invalid_code", "That code is not right. Check it and try again.");
  const challenge = await deps.store.getChallenge(challengeId);
  if (!challenge || challenge.consumed || challenge.expiresAt <= deps.now()) {
    throw new ApiError(400, "code_expired", "That code has expired. Request a new one.");
  }

  // Count the attempt before comparing, so parallel guesses cannot exceed the cap.
  const attempts = await deps.store.bumpChallengeAttempts(challengeId);
  if (attempts > OTP_MAX_ATTEMPTS) {
    throw new ApiError(400, "code_expired", "Too many wrong codes. Request a new one.");
  }
  if (!/^\d{6}$/.test(code)) throw invalid;

  if (challenge.providerRef) {
    if (!deps.verifier) throw new Error("Challenge belongs to a verification service that is not configured");
    if (!(await deps.verifier.check(challenge.providerRef, code))) throw invalid;
  } else if (!challenge.codeHash || !sameHash(challenge.codeHash, codeHash(deps.secret, challengeId, code))) {
    throw invalid;
  }

  await deps.store.consumeChallenge(challengeId);
  return { phoneLookup: challenge.phoneLookup, user: await deps.store.getUserByPhone(challenge.phoneLookup) };
}

/** True when `handle` is well-formed and nobody holds it on-chain. */
export async function isHandleAvailable(deps: IdentityDeps, handle: string): Promise<boolean> {
  if (!isValidHandle(handle)) return false;
  return isAddressEqual(await deps.registry.resolveHandle(handle), zeroAddress);
}

export type Attestation = { phoneHash: Hex; handle: string; deadline: number; signature: Hex };

/**
 * Issues the attestation that lets `account` register `handle` under the
 * verified phone. The caller must already hold a phone-verification token for
 * `lookup`; this function trusts that.
 */
export async function attestRegistration(
  deps: IdentityDeps,
  lookup: Hex,
  account: Address,
  handle: string,
): Promise<Attestation> {
  if (!(await deps.store.hit(`attest:${lookup}`, 60 * 60, 10))) throw tooMany();
  if (isAddressEqual(account, zeroAddress)) throw new ApiError(400, "invalid_account", "Invalid account");
  if (!isValidHandle(handle)) {
    throw new ApiError(400, "invalid_handle", "Handles are 3–20 letters, numbers or underscores, starting with a letter.");
  }

  const existing = await deps.store.getUserByPhone(lookup);
  if (existing?.status === "registered") {
    throw new ApiError(409, "phone_registered", "This number already has a CrackPay account. Sign in instead.");
  }
  if (!(await isHandleAvailable(deps, handle))) {
    throw new ApiError(409, "handle_taken", "That handle is taken. Try another.");
  }

  // A returning pending user keeps their salt, so their phone hash never changes.
  const salt = existing?.phoneSalt ?? newSalt();
  const hash = phoneHash(salt, lookup);
  await deps.store.savePendingUser({ phoneLookup: lookup, phoneSalt: salt, phoneHash: hash, smartAccount: account, handle });

  const deadline = Math.floor(deps.now() / 1000) + ATTESTATION_TTL_SECONDS;
  if (!deps.attester.signTypedData) throw new Error("Attester account cannot sign typed data");
  const signature = await deps.attester.signTypedData({
    domain: {
      name: IDENTITY_DOMAIN_NAME,
      version: IDENTITY_DOMAIN_VERSION,
      chainId: deps.chainId,
      verifyingContract: deps.registryAddress,
    },
    types: registrationTypes,
    primaryType: "Registration",
    message: { account, phoneHash: hash, handle, deadline: BigInt(deadline) },
  });
  return { phoneHash: hash, handle, deadline, signature };
}

/**
 * Marks the user registered once the chain shows their phone hash resolving to
 * their account. The chain is the source of truth; the database follows it.
 */
export async function confirmRegistration(deps: IdentityDeps, lookup: Hex): Promise<User> {
  const user = await deps.store.getUserByPhone(lookup);
  if (!user || !user.smartAccount) throw new ApiError(404, "not_found", "No registration in progress.");
  if (user.status === "registered") return user;

  const onChain = await deps.registry.resolvePhone(user.phoneHash);
  if (!isAddressEqual(onChain, user.smartAccount)) {
    throw new ApiError(409, "not_registered", "The registration has not landed on-chain yet.");
  }
  await deps.store.markRegistered(user.id);
  return { ...user, status: "registered" };
}

/** Looks up one registered user by phone number. Rate-limited per caller; never bulk. */
export async function resolvePhoneNumber(
  deps: IdentityDeps,
  callerId: string,
  phoneInput: string,
): Promise<{ account: Address; handle: string } | null> {
  if (!(await deps.store.hit(`resolve:${callerId}`, 60 * 60, 30))) throw tooMany();
  const user = await deps.store.getUserByPhone(phoneLookup(deps.pepper, normalizePhone(phoneInput)));
  if (!user || user.status !== "registered" || !user.smartAccount || !user.handle) return null;
  return { account: user.smartAccount, handle: user.handle };
}
