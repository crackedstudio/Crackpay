import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRACKPAY_ORIGINS, ErrorCode, arcTestnet, errorCode, getCrackPayProvider, isFramed, isUserRejection, tokens } from "./index.js";

describe("outside a browser", () => {
  it("resolves to null and reports not framed, without throwing", async () => {
    expect(isFramed()).toBe(false);
    expect(await getCrackPayProvider()).toBeNull();
  });
});

describe("constants", () => {
  it("describe Arc Testnet consistently", () => {
    expect(arcTestnet.id).toBe(5042002);
    expect(Number(arcTestnet.hexId)).toBe(arcTestnet.id);
    expect(tokens.USDC.decimals).toBe(6);
    expect(tokens.EURC.decimals).toBe(6);
    for (const origin of CRACKPAY_ORIGINS) expect(new URL(origin).origin).toBe(origin);
  });
});

describe("error helpers", () => {
  it("read the code from a provider error or from the error wrapping it", () => {
    expect(errorCode({ code: 4001 })).toBe(4001);
    expect(errorCode({ message: "wrapped", cause: { code: 4100 } })).toBe(4100);
    expect(errorCode(new Error("plain"))).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode("text")).toBeUndefined();
  });

  it("recognise a user cancelling, and nothing else, as a rejection", () => {
    expect(isUserRejection({ code: ErrorCode.UserRejected })).toBe(true);
    expect(isUserRejection({ cause: { code: 4001 } })).toBe(true);
    expect(isUserRejection({ code: ErrorCode.Unauthorized })).toBe(false);
    expect(isUserRejection({ message: "User rejected the request" })).toBe(false);
  });
});

describe("inside CrackPay", () => {
  const HOST = "https://crackpay.vercel.app";
  const ACCOUNT = "0x2222222222222222222222222222222222222222";

  // The connection is made once per page and remembered, so each test needs a fresh module.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** A framed page whose parent behaves like the CrackPay host. */
  function frame(hostOrigin: string) {
    const listeners = new Set<(event: unknown) => void>();
    const parent = {
      postMessage(message: { type: string; id?: number; method?: string }, targetOrigin: string) {
        // The browser only delivers a message whose target origin matches the receiver's.
        if (targetOrigin !== hostOrigin) return;
        const reply = (data: object) =>
          queueMicrotask(() => {
            for (const listener of listeners) {
              listener({ source: parent, origin: hostOrigin, data: { protocol: "crackpay-miniapp", version: 1, ...data } });
            }
          });
        if (message.type === "hello") reply({ type: "ready", chainId: "0x4cef52", accounts: [ACCOUNT] });
        if (message.type === "request") {
          const result = message.method === "eth_requestAccounts" ? [ACCOUNT] : message.method === "eth_chainId" ? "0x4cef52" : null;
          reply({ type: "response", id: message.id, result });
        }
      },
    };
    const window = {
      parent,
      addEventListener: (type: string, listener: (event: unknown) => void) => type === "message" && listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: unknown) => void) => listeners.delete(listener),
      dispatchEvent: () => true,
    };
    vi.stubGlobal("window", window);
    vi.stubGlobal("CustomEvent", class {});
    return window as typeof window & { ethereum?: unknown };
  }

  it("connects to the default CrackPay host and returns viem clients for the account", async () => {
    const window = frame(HOST);
    const { connectCrackPay } = await import("./viem.js");

    const connection = await connectCrackPay();
    expect(connection?.account).toBe(ACCOUNT);
    expect(connection?.provider.isCrackPay).toBe(true);
    expect(connection?.walletClient.chain?.id).toBe(5042002);
    expect(window.ethereum).toBe(connection?.provider);
  });

  it("ignores a host that is not on the trusted list", async () => {
    frame("https://not-crackpay.example");
    const { getCrackPayProvider: connect } = await import("./index.js");
    expect(await connect({ timeoutMs: 300 })).toBeNull();
  });

  it("trusts another host only when told to", async () => {
    frame("http://localhost:3000");
    const { getCrackPayProvider: connect } = await import("./index.js");
    const provider = await connect({ hostOrigins: ["http://localhost:3000"] });
    expect(provider?.isCrackPay).toBe(true);
  });
});
