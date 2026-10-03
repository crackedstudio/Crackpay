import type { Address, Hash } from "viem";
import { describe, expect, it, vi } from "vitest";
import { handleRequest, toWireError, type BridgeDeps } from "./bridge";
import { RpcError, unauthorized } from "./errors";
import {
  createProvider,
  envelope,
  isMiniAppMessage,
  ProviderRpcError,
  type MiniAppMessage,
  type RequestMessage,
} from "./sdk";

const ACCOUNT: Address = "0x2222222222222222222222222222222222222222";
const ESCROW: Address = "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62";
const TX_HASH: Hash = `0x${"ab".repeat(32)}`;
const CHAIN_ID = 5042002;

function makeDeps(overrides: Partial<BridgeDeps> = {}): BridgeDeps {
  return {
    chainId: CHAIN_ID,
    account: ACCOUNT,
    handle: "alice",
    check: (tx) => ({ kind: "contract", to: tx.to, value: tx.value }),
    confirm: async () => true,
    send: async () => ({ transactionHash: TX_HASH, success: true }),
    read: async () => "0x1",
    ...overrides,
  };
}

async function code(promise: Promise<unknown>): Promise<number | undefined> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RpcError) return error.code;
    throw error;
  }
  return undefined;
}

describe("handleRequest", () => {
  it("reports the chain and the connected account without prompting", async () => {
    const deps = makeDeps({ confirm: vi.fn() });
    expect(await handleRequest(deps, "eth_chainId", undefined)).toBe("0x4cef52");
    expect(await handleRequest(deps, "net_version", undefined)).toBe("5042002");
    expect(await handleRequest(deps, "eth_accounts", undefined)).toEqual([ACCOUNT]);
    expect(await handleRequest(deps, "eth_requestAccounts", undefined)).toEqual([ACCOUNT]);
    expect(deps.confirm).not.toHaveBeenCalled();
  });

  it("tells the app the user's account and CrackPay handle without prompting", async () => {
    const deps = makeDeps({ confirm: vi.fn() });
    expect(await handleRequest(deps, "crackpay_getProfile", undefined)).toEqual({ account: ACCOUNT, handle: "alice" });
    expect(await handleRequest(makeDeps({ handle: null }), "crackpay_getProfile", [])).toEqual({ account: ACCOUNT, handle: null });
    expect(deps.confirm).not.toHaveBeenCalled();
  });

  it("accepts a switch to Arc and refuses any other chain", async () => {
    const deps = makeDeps();
    expect(await handleRequest(deps, "wallet_switchEthereumChain", [{ chainId: "0x4cef52" }])).toBeNull();
    expect(await code(handleRequest(deps, "wallet_switchEthereumChain", [{ chainId: "0x1" }]))).toBe(4902);
    expect(await code(handleRequest(deps, "wallet_addEthereumChain", [{ chainId: "0x1" }]))).toBe(4200);
    expect(await code(handleRequest(deps, "wallet_switchEthereumChain", []))).toBe(-32602);
  });

  it("checks, confirms and sends a transaction, in that order", async () => {
    const order: string[] = [];
    const deps = makeDeps({
      check: (tx) => {
        order.push("check");
        return { kind: "contract", to: tx.to, value: tx.value };
      },
      confirm: async () => {
        order.push("confirm");
        return true;
      },
      send: async (tx) => {
        order.push("send");
        expect(tx).toEqual({ to: ESCROW, data: "0x1234", value: 1_000_000_000_000_000_000n });
        return { transactionHash: TX_HASH, success: true };
      },
    });

    const params = [{ from: ACCOUNT, to: ESCROW, data: "0x1234", value: "0xde0b6b3a7640000", gas: "0x5208" }];
    expect(await handleRequest(deps, "eth_sendTransaction", params)).toBe(TX_HASH);
    expect(order).toEqual(["check", "confirm", "send"]);
  });

  it("defaults data and value, and accepts `input` for data", async () => {
    const send = vi.fn(async () => ({ transactionHash: TX_HASH, success: true }));
    await handleRequest(makeDeps({ send }), "eth_sendTransaction", [{ to: ESCROW }]);
    expect(send).toHaveBeenLastCalledWith({ to: ESCROW, data: "0x", value: 0n });
    await handleRequest(makeDeps({ send }), "eth_sendTransaction", [{ to: ESCROW, input: "0xabcd" }]);
    expect(send).toHaveBeenLastCalledWith({ to: ESCROW, data: "0xabcd", value: 0n });
  });

  it("sends nothing when the user declines", async () => {
    const send = vi.fn();
    const deps = makeDeps({ confirm: async () => false, send });
    expect(await code(handleRequest(deps, "eth_sendTransaction", [{ to: ESCROW }]))).toBe(4001);
    expect(send).not.toHaveBeenCalled();
  });

  it("neither prompts nor sends when the policy refuses", async () => {
    const confirm = vi.fn();
    const send = vi.fn();
    const deps = makeDeps({
      check: () => {
        throw unauthorized("not allowed");
      },
      confirm,
      send,
    });
    expect(await code(handleRequest(deps, "eth_sendTransaction", [{ to: ESCROW }]))).toBe(4100);
    expect(confirm).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("reports a reverted userOp as an error, not a hash", async () => {
    const deps = makeDeps({ send: async () => ({ transactionHash: TX_HASH, success: false }) });
    expect(await code(handleRequest(deps, "eth_sendTransaction", [{ to: ESCROW }]))).toBe(-32603);
  });

  it.each<[unknown, string]>([
    [[{ from: "0x3333333333333333333333333333333333333333", to: ESCROW }], "another sender"],
    [[{ data: "0x6080" }], "contract creation"],
    [[{ to: "0x0000000000000000000000000000000000000000" }], "the zero address"],
    [[{ to: "not-an-address" }], "a malformed recipient"],
    [[{ to: ESCROW, value: "100" }], "a non-hex value"],
    [[{ to: ESCROW, data: "xyz" }], "non-hex data"],
    [[], "no parameters"],
    ["nope", "non-array parameters"],
  ])("rejects %j (%s) before prompting", async (params) => {
    const confirm = vi.fn();
    expect(await code(handleRequest(makeDeps({ confirm }), "eth_sendTransaction", params))).toBe(-32602);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("forwards read methods and nothing else", async () => {
    const read = vi.fn(async () => "0x10");
    const deps = makeDeps({ read });
    expect(await handleRequest(deps, "eth_getBalance", [ACCOUNT, "latest"])).toBe("0x10");
    expect(read).toHaveBeenCalledWith("eth_getBalance", [ACCOUNT, "latest"]);

    for (const method of ["personal_sign", "eth_signTypedData_v4", "eth_sign", "eth_sendRawTransaction", "wallet_getPermissions", "debug_traceCall"]) {
      expect(await code(handleRequest(deps, method, []))).toBe(4200);
    }
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("toWireError", () => {
  it("keeps RPC error codes, maps a dismissed passkey to a rejection, hides the rest behind -32603", () => {
    expect(toWireError(new RpcError(4100, "no"))).toEqual({ code: 4100, message: "no" });
    const dismissed = new Error("The operation either timed out or was not allowed.");
    dismissed.name = "NotAllowedError";
    expect(toWireError(dismissed).code).toBe(4001);
    expect(toWireError(new Error("boom"))).toEqual({ code: -32603, message: "boom" });
    expect(toWireError("weird")).toEqual({ code: -32603, message: "Internal error" });
  });
});

describe("provider ↔ bridge", () => {
  /** Wires the Mini App provider to the host bridge the way postMessage does, minus the windows. */
  function connect(deps: BridgeDeps) {
    let toApp: (message: MiniAppMessage) => void = () => {};
    const provider = createProvider({
      subscribe(listener) {
        toApp = listener;
        return () => {};
      },
      post(message: RequestMessage) {
        // Crossing a real frame boundary serialises the message.
        const received: unknown = structuredClone(message);
        if (!isMiniAppMessage(received) || received.type !== "request") throw new Error("malformed");
        handleRequest(deps, received.method, received.params).then(
          (result) => toApp(envelope({ type: "response", id: received.id, result })),
          (error: unknown) => toApp(envelope({ type: "response", id: received.id, error: toWireError(error) })),
        );
      },
    });
    return { provider, emit: (event: string, data: unknown) => toApp(envelope({ type: "event", event, data })) };
  }

  it("round-trips a connect and a transaction", async () => {
    const { provider } = connect(makeDeps());
    expect(provider.isCrackPay).toBe(true);
    expect(await provider.request({ method: "eth_requestAccounts" })).toEqual([ACCOUNT]);
    expect(await provider.request({ method: "eth_sendTransaction", params: [{ from: ACCOUNT, to: ESCROW, value: "0x1" }] })).toBe(TX_HASH);
  });

  it("matches concurrent responses to their requests", async () => {
    const { provider } = connect(makeDeps({ read: async (method) => method }));
    const results = await Promise.all(
      ["eth_blockNumber", "eth_gasPrice", "eth_getCode"].map((method) => provider.request({ method })),
    );
    expect(results).toEqual(["eth_blockNumber", "eth_gasPrice", "eth_getCode"]);
  });

  it("surfaces host errors as ProviderRpcError with the code intact", async () => {
    const { provider } = connect(makeDeps({ confirm: async () => false }));
    const error = await provider
      .request({ method: "eth_sendTransaction", params: [{ to: ESCROW }] })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderRpcError);
    expect((error as ProviderRpcError).code).toBe(4001);
  });

  it("delivers events to listeners until they are removed", () => {
    const { provider, emit } = connect(makeDeps());
    const listener = vi.fn();
    provider.on("accountsChanged", listener);
    emit("accountsChanged", [ACCOUNT]);
    provider.removeListener("accountsChanged", listener);
    emit("accountsChanged", []);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([ACCOUNT]);
  });
});

describe("isMiniAppMessage", () => {
  it("accepts only this protocol and version", () => {
    expect(isMiniAppMessage(envelope({ type: "hello" }))).toBe(true);
    expect(isMiniAppMessage({ protocol: "crackpay-miniapp", version: 2, type: "hello" })).toBe(false);
    expect(isMiniAppMessage({ protocol: "other", version: 1, type: "hello" })).toBe(false);
    expect(isMiniAppMessage({ type: "hello" })).toBe(false);
    expect(isMiniAppMessage(null)).toBe(false);
    expect(isMiniAppMessage("hello")).toBe(false);
  });
});
