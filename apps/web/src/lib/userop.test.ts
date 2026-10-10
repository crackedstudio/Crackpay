import { parseGwei, type Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The bundler and the chain are faked: these tests are about who pays the fee.
const bundler = {
  prepareUserOperation: vi.fn(),
  request: vi.fn(),
  waitForUserOperationReceipt: vi.fn(),
};
const chain = { estimateFeesPerGas: vi.fn(), getBalance: vi.fn(), readContract: vi.fn() };

vi.mock("./wallet", () => ({ createArcBundlerClient: () => bundler }));
vi.mock("./arc", () => ({
  publicClient: chain,
  arcContracts: { usdc: "0x3600000000000000000000000000000000000000", identityRegistry: "0x0000000000000000000000000000000000000001" },
}));

const { GasFundsError, sendUserOp } = await import("./userop");

const ACCOUNT = "0x2222222222222222222222222222222222222222" as Address;
const account = {
  address: ACCOUNT,
  entryPoint: { address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" },
  signUserOperation: vi.fn(async () => "0xsig"),
} as never as Parameters<typeof sendUserOp>[0];
const calls = [{ to: ACCOUNT, data: "0x" as const }];

/** A prepared userOp: 100k gas in all at `maxFeePerGas`. */
const op = (maxFeePerGas: bigint) => ({
  sender: ACCOUNT,
  nonce: 0n,
  callData: "0x",
  callGasLimit: 60_000n,
  verificationGasLimit: 30_000n,
  preVerificationGas: 10_000n,
  maxFeePerGas,
  maxPriorityFeePerGas: 1n,
  signature: "0x",
});

beforeEach(() => {
  vi.clearAllMocks();
  // Circle quotes 41.5 gwei with a 1.5 gwei tip, as it did on 2026-10-09.
  bundler.request.mockImplementation(async ({ method }: { method: string }) =>
    method === "circle_getUserOperationGasPrice"
      ? { low: { maxFeePerGas: "41500000000", maxPriorityFeePerGas: "1500000000" } }
      : "0xhash",
  );
  bundler.waitForUserOperationReceipt.mockResolvedValue({
    success: true,
    receipt: { transactionHash: "0xtx" },
    actualGasCost: parseGwei("40") * 80_000n, // 0.0032 USDC, native units
  });
  chain.estimateFeesPerGas.mockResolvedValue({ maxFeePerGas: parseGwei("40"), maxPriorityFeePerGas: parseGwei("1") });
  chain.readContract.mockResolvedValue(0n); // no EntryPoint deposit
});

describe("sendUserOp", () => {
  it("lets a deposit left in the EntryPoint by an earlier fee pay this one", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bundler.prepareUserOperation.mockRejectedValueOnce(new Error("paused")).mockResolvedValueOnce(op(parseGwei("40")));
    chain.getBalance.mockResolvedValue(0n);
    chain.readContract.mockResolvedValue(parseGwei("40") * 100_000n); // exactly this op's worst case

    await expect(sendUserOp(account, calls)).resolves.toMatchObject({ status: "confirmed" });
  });

  it("counts the payment against the balance too, so a fee is never spent on a payment that cannot go through", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bundler.prepareUserOperation.mockRejectedValueOnce(new Error("paused")).mockResolvedValueOnce(op(parseGwei("40")));
    chain.getBalance.mockResolvedValue(10n ** 18n); // $1.00

    // $1.00 out with a $0.004 fee does not fit in $1.00.
    await expect(sendUserOp(account, calls, 1_000_000n)).rejects.toBeInstanceOf(GasFundsError);
    expect(account.signUserOperation).not.toHaveBeenCalled();
  });

  it("uses Circle's sponsorship when it is available", async () => {
    bundler.prepareUserOperation.mockResolvedValueOnce(op(parseGwei("40")));
    const result = await sendUserOp(account, calls);

    expect(bundler.prepareUserOperation).toHaveBeenCalledTimes(1);
    // The bundler's 1 gwei tip floor applies to sponsored userOps too, so they
    // bid Circle's quote rather than Arc's node estimate (a tip of ~1,000 wei).
    expect(bundler.prepareUserOperation.mock.calls[0]?.[0]).toMatchObject({
      paymaster: true,
      maxFeePerGas: parseGwei("41.5"),
      maxPriorityFeePerGas: parseGwei("1.5"),
    });
    expect(chain.getBalance).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "confirmed", gas: { sponsored: true } });
  });

  it("pays the fee from the account when sponsorship fails, and reports what it cost", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bundler.prepareUserOperation.mockRejectedValueOnce(new Error("Internal error")).mockResolvedValueOnce(op(parseGwei("40")));
    chain.getBalance.mockResolvedValue(10n ** 18n); // $1

    const result = await sendUserOp(account, calls);

    const selfPaid = bundler.prepareUserOperation.mock.calls[1]?.[0];
    expect(selfPaid).not.toHaveProperty("paymaster");
    // Circle's own quote, which its bundler accepts.
    expect(selfPaid).toMatchObject({ maxFeePerGas: parseGwei("41.5"), maxPriorityFeePerGas: parseGwei("1.5") });
    expect(account.signUserOperation).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "confirmed", gas: { sponsored: false, fee: 3_200n } });
  });

  it("never bids under Arc's 20 gwei floor or Circle's 1 gwei tip, even when the quote fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bundler.request.mockImplementation(async ({ method }: { method: string }) => {
      if (method === "circle_getUserOperationGasPrice") throw new Error("quote unavailable");
      return "0xhash";
    });
    // What Arc's node suggested on 2026-10-09: a tip of about a thousand wei.
    chain.estimateFeesPerGas.mockResolvedValue({ maxFeePerGas: parseGwei("2"), maxPriorityFeePerGas: 1_323n });
    bundler.prepareUserOperation.mockRejectedValueOnce(new Error("paused")).mockResolvedValueOnce(op(parseGwei("20")));
    chain.getBalance.mockResolvedValue(10n ** 18n);

    await sendUserOp(account, calls);

    expect(bundler.prepareUserOperation.mock.calls[1]?.[0]).toMatchObject({
      maxFeePerGas: parseGwei("21"),
      maxPriorityFeePerGas: parseGwei("1"),
    });
  });

  it("stops before the passkey prompt when the account cannot pay the fee", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bundler.prepareUserOperation.mockRejectedValueOnce(new Error("paused")).mockResolvedValueOnce(op(parseGwei("40")));
    chain.getBalance.mockResolvedValue(0n);

    const sent = sendUserOp(account, calls);

    await expect(sent).rejects.toBeInstanceOf(GasFundsError);
    // 100k gas at 40 gwei = 0.004 USDC = 4,000 base units.
    await expect(sent).rejects.toMatchObject({ fee: 4_000n });
    expect(account.signUserOperation).not.toHaveBeenCalled();
    expect(bundler.request).not.toHaveBeenCalledWith(expect.objectContaining({ method: "eth_sendUserOperation" }));
  });
});
