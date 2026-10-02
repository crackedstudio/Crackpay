import { hashTypedData, recoverTypedDataAddress, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, it } from "vitest";
import { IDENTITY_DOMAIN_NAME, IDENTITY_DOMAIN_VERSION, registrationTypes } from "../../config/identity";
import { ApiError } from "./errors";
import {
  attestRegistration,
  confirmRegistration,
  isHandleAvailable,
  resolvePhoneNumber,
  startOtp,
  verifyOtp,
  OTP_TTL_SECONDS,
  type IdentityDeps,
} from "./identity-service";
import { MemoryStore } from "./store";

const ATTESTER = privateKeyToAccount(`0x${"a1".repeat(32)}`);
const REGISTRY: Address = "0x1c36829d1d82470bfb9FAd9bE264729c26753Ef7";
const ALICE: Address = "0x2222222222222222222222222222222222222222";
const BOB: Address = "0x3333333333333333333333333333333333333333";
const PHONE = "+2348012345678";
const CHAIN_ID = 5042002;

let now: number;
let sent: { phone: string; message: string }[];
let handles: Map<string, Address>;
let phones: Map<Hex, Address>;
let deps: IdentityDeps;

beforeEach(() => {
  now = Date.UTC(2026, 9, 2);
  sent = [];
  handles = new Map();
  phones = new Map();
  deps = {
    store: new MemoryStore(() => now),
    sms: { send: async (phone, message) => void sent.push({ phone, message }) },
    registry: {
      resolveHandle: async (handle) => handles.get(handle) ?? zeroAddress,
      resolvePhone: async (hash) => phones.get(hash) ?? zeroAddress,
    },
    attester: ATTESTER,
    chainId: CHAIN_ID,
    registryAddress: REGISTRY,
    pepper: "test-pepper",
    secret: "test-secret",
    now: () => now,
  };
});

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error.code;
    throw error;
  }
  return undefined;
}

const sentCode = () => /code is (\d{6})/.exec(sent.at(-1)?.message ?? "")?.[1] ?? "";

async function verifiedLookup(phone = PHONE): Promise<Hex> {
  const { challengeId } = await startOtp(deps, phone, "1.1.1.1");
  return (await verifyOtp(deps, challengeId, sentCode())).phoneLookup;
}

describe("OTP", () => {
  it("sends a 6-digit code to the normalised number and accepts it once", async () => {
    const { challengeId } = await startOtp(deps, "+234 801 234-5678", "1.1.1.1");
    expect(sent[0]?.phone).toBe(PHONE);
    expect(sentCode()).toMatch(/^\d{6}$/);

    const verified = await verifyOtp(deps, challengeId, sentCode());
    expect(verified.user).toBeNull();
    expect(verified.phoneLookup).toMatch(/^0x[0-9a-f]{64}$/);
    expect(await code(verifyOtp(deps, challengeId, sentCode()))).toBe("code_expired");
  });

  it("returns the code to the caller only when development exposure is on", async () => {
    expect(await startOtp(deps, PHONE, "1.1.1.1")).not.toHaveProperty("devCode");

    deps.exposeDevCode = true;
    const started = await startOtp(deps, PHONE, "1.1.1.1");
    expect(started.devCode).toBe(sentCode());

    // A hosted verifier holds the code, so there is nothing to expose.
    deps.verifier = { start: async () => "ref", check: async () => true };
    expect(await startOtp(deps, PHONE, "1.1.1.1")).not.toHaveProperty("devCode");
  });

  it("rejects malformed numbers before sending anything", async () => {
    for (const phone of ["08012345678", "+0123456789", "+12", "+1234567890123456", "hello", ""]) {
      expect(await code(startOtp(deps, phone, "1.1.1.1"))).toBe("invalid_phone");
    }
    expect(sent).toHaveLength(0);
  });

  it("rejects wrong codes and locks the challenge after five attempts", async () => {
    deps.generateCode = () => "123456";
    const { challengeId } = await startOtp(deps, PHONE, "1.1.1.1");
    for (let i = 0; i < 5; i++) {
      expect(await code(verifyOtp(deps, challengeId, "000000"))).toBe("invalid_code");
    }
    expect(await code(verifyOtp(deps, challengeId, "123456"))).toBe("code_expired");
  });

  it("rejects non-numeric and wrong-length codes", async () => {
    deps.generateCode = () => "123456";
    const { challengeId } = await startOtp(deps, PHONE, "1.1.1.1");
    expect(await code(verifyOtp(deps, challengeId, "12345"))).toBe("invalid_code");
    expect(await code(verifyOtp(deps, challengeId, "abcdef"))).toBe("invalid_code");
    expect((await verifyOtp(deps, challengeId, "123456")).phoneLookup).toBeDefined();
  });

  it("expires codes after ten minutes", async () => {
    const { challengeId } = await startOtp(deps, PHONE, "1.1.1.1");
    const value = sentCode();
    now += OTP_TTL_SECONDS * 1000;
    expect(await code(verifyOtp(deps, challengeId, value))).toBe("code_expired");
  });

  it("does not accept one challenge's code for another", async () => {
    deps.generateCode = () => "111111";
    const first = await startOtp(deps, PHONE, "1.1.1.1");
    deps.generateCode = () => "222222";
    const second = await startOtp(deps, "+2348099999999", "1.1.1.1");
    expect(await code(verifyOtp(deps, second.challengeId, "111111"))).toBe("invalid_code");
    expect(await code(verifyOtp(deps, first.challengeId, "222222"))).toBe("invalid_code");
    expect(await code(verifyOtp(deps, "no-such-challenge", "111111"))).toBe("code_expired");
  });

  it("limits codes per number and per IP, and recovers after the window", async () => {
    for (let i = 0; i < 5; i++) await startOtp(deps, PHONE, `10.0.0.${i}`);
    expect(await code(startOtp(deps, PHONE, "10.0.0.9"))).toBe("rate_limited");

    for (let i = 0; i < 20; i++) await startOtp(deps, `+23480000000${String(i).padStart(2, "0")}`, "2.2.2.2");
    expect(await code(startOtp(deps, "+2348011111111", "2.2.2.2"))).toBe("rate_limited");

    now += 60 * 60 * 1000 + 1;
    await startOtp(deps, PHONE, "2.2.2.2");
  });
});

describe("OTP through a hosted verifier", () => {
  it("lets the service hold the code, and never stores one itself", async () => {
    const checks: [string, string][] = [];
    deps.verifier = {
      start: async (phone) => `ref-for-${phone}`,
      check: async (reference, code) => {
        checks.push([reference, code]);
        return code === "424242";
      },
    };

    const { challengeId } = await startOtp(deps, PHONE, "1.1.1.1");
    expect(sent).toHaveLength(0);
    expect(await deps.store.getChallenge(challengeId)).toMatchObject({ codeHash: null, providerRef: `ref-for-${PHONE}` });

    expect(await code(verifyOtp(deps, challengeId, "000000"))).toBe("invalid_code");
    expect((await verifyOtp(deps, challengeId, "424242")).phoneLookup).toMatch(/^0x/);
    expect(checks).toEqual([
      [`ref-for-${PHONE}`, "000000"],
      [`ref-for-${PHONE}`, "424242"],
    ]);
    // Consumed: the service is not asked again.
    expect(await code(verifyOtp(deps, challengeId, "424242"))).toBe("code_expired");
    expect(checks).toHaveLength(2);
  });

  it("still caps attempts and rejects malformed codes without calling the service", async () => {
    let calls = 0;
    deps.verifier = { start: async () => "ref", check: async () => (calls++, false) };
    const { challengeId } = await startOtp(deps, PHONE, "1.1.1.1");

    expect(await code(verifyOtp(deps, challengeId, "abc"))).toBe("invalid_code");
    expect(calls).toBe(0);
    for (let i = 0; i < 4; i++) expect(await code(verifyOtp(deps, challengeId, "111111"))).toBe("invalid_code");
    expect(await code(verifyOtp(deps, challengeId, "111111"))).toBe("code_expired");
    expect(calls).toBe(4);
  });

  it("creates no challenge when the service refuses to send", async () => {
    deps.verifier = {
      start: async () => {
        throw new ApiError(400, "sms_failed", "nope");
      },
      check: async () => false,
    };
    expect(await code(startOtp(deps, PHONE, "1.1.1.1"))).toBe("sms_failed");
  });
});

describe("attestRegistration", () => {
  it("signs an attestation the registry will accept", async () => {
    const lookup = await verifiedLookup();
    const attestation = await attestRegistration(deps, lookup, ALICE, "alice");

    expect(attestation.handle).toBe("alice");
    expect(attestation.deadline).toBe(Math.floor(now / 1000) + 600);
    const typedData = {
      domain: { name: IDENTITY_DOMAIN_NAME, version: IDENTITY_DOMAIN_VERSION, chainId: CHAIN_ID, verifyingContract: REGISTRY },
      types: registrationTypes,
      primaryType: "Registration",
      message: { account: ALICE, phoneHash: attestation.phoneHash, handle: "alice", deadline: BigInt(attestation.deadline) },
    } as const;
    expect(await recoverTypedDataAddress({ ...typedData, signature: attestation.signature })).toBe(ATTESTER.address);
  });

  it("uses the typed-data layout the contract tests pin", () => {
    // Same inputs and expected digest as test_DigestMatchesViem in IdentityRegistry.t.sol.
    const digest = hashTypedData({
      domain: {
        name: IDENTITY_DOMAIN_NAME,
        version: IDENTITY_DOMAIN_VERSION,
        chainId: CHAIN_ID,
        verifyingContract: "0x1111111111111111111111111111111111111111",
      },
      types: registrationTypes,
      primaryType: "Registration",
      message: {
        account: "0x2222222222222222222222222222222222222222",
        phoneHash: `0x${"1234".padStart(64, "0")}`,
        handle: "alice",
        deadline: 1_800_000_000n,
      },
    });
    expect(digest).toBe("0x490f06b4f3b88a9a550ae94176497dda7b449c7cede70d630a529edb67f45e7e");
  });

  it("gives each user a different phone hash that stays stable across retries", async () => {
    const aliceLookup = await verifiedLookup(PHONE);
    const first = await attestRegistration(deps, aliceLookup, ALICE, "alice");
    const retry = await attestRegistration(deps, aliceLookup, ALICE, "alice2");
    expect(retry.phoneHash).toBe(first.phoneHash);

    const bobLookup = await verifiedLookup("+2348099999999");
    const bob = await attestRegistration(deps, bobLookup, BOB, "bob");
    expect(bob.phoneHash).not.toBe(first.phoneHash);
    // The on-chain hash is not the lookup key, so the registry cannot be matched against it.
    expect(first.phoneHash).not.toBe(aliceLookup);
  });

  it("refuses invalid or taken handles and the zero account", async () => {
    const lookup = await verifiedLookup();
    expect(await code(attestRegistration(deps, lookup, ALICE, "Al"))).toBe("invalid_handle");
    expect(await code(attestRegistration(deps, lookup, ALICE, "1alice"))).toBe("invalid_handle");
    expect(await code(attestRegistration(deps, lookup, zeroAddress, "alice"))).toBe("invalid_account");
    handles.set("alice", BOB);
    expect(await code(attestRegistration(deps, lookup, ALICE, "alice"))).toBe("handle_taken");
  });

  it("refuses a number that is already registered", async () => {
    const lookup = await verifiedLookup();
    const attestation = await attestRegistration(deps, lookup, ALICE, "alice");
    phones.set(attestation.phoneHash, ALICE);
    await confirmRegistration(deps, lookup);
    expect(await code(attestRegistration(deps, lookup, BOB, "bob"))).toBe("phone_registered");
  });
});

describe("confirmRegistration", () => {
  it("waits for the chain, then marks the user registered", async () => {
    const lookup = await verifiedLookup();
    expect(await code(confirmRegistration(deps, lookup))).toBe("not_found");

    const attestation = await attestRegistration(deps, lookup, ALICE, "alice");
    expect(await code(confirmRegistration(deps, lookup))).toBe("not_registered");

    // Registered on-chain to someone else: still not confirmed.
    phones.set(attestation.phoneHash, BOB);
    expect(await code(confirmRegistration(deps, lookup))).toBe("not_registered");

    phones.set(attestation.phoneHash, ALICE);
    expect((await confirmRegistration(deps, lookup)).status).toBe("registered");
    expect((await confirmRegistration(deps, lookup)).status).toBe("registered");

    const { challengeId } = await startOtp(deps, PHONE, "1.1.1.1");
    const verified = await verifyOtp(deps, challengeId, sentCode());
    expect(verified.user).toMatchObject({ status: "registered", handle: "alice", smartAccount: ALICE });
  });
});

describe("handles and phone resolution", () => {
  it("reports availability from format and chain state", async () => {
    expect(await isHandleAvailable(deps, "alice")).toBe(true);
    expect(await isHandleAvailable(deps, "Alice")).toBe(false);
    handles.set("alice", ALICE);
    expect(await isHandleAvailable(deps, "alice")).toBe(false);
  });

  it("resolves only registered numbers", async () => {
    expect(await resolvePhoneNumber(deps, "caller", PHONE)).toBeNull();

    const lookup = await verifiedLookup();
    const attestation = await attestRegistration(deps, lookup, ALICE, "alice");
    expect(await resolvePhoneNumber(deps, "caller", PHONE)).toBeNull();

    phones.set(attestation.phoneHash, ALICE);
    await confirmRegistration(deps, lookup);
    expect(await resolvePhoneNumber(deps, "caller", "+234 801 234 5678")).toEqual({ account: ALICE, handle: "alice" });
  });

  it("caps lookups per caller so the directory cannot be walked", async () => {
    for (let i = 0; i < 30; i++) await resolvePhoneNumber(deps, "caller", PHONE);
    expect(await code(resolvePhoneNumber(deps, "caller", PHONE))).toBe("rate_limited");
    expect(await resolvePhoneNumber(deps, "someone-else", PHONE)).toBeNull();
  });
});
