import { installCrackPayProvider, type MiniAppProvider } from "./provider.js";

export {
  PROTOCOL_VERSION,
  ProviderRpcError,
  WALLET_INFO,
  installCrackPayProvider,
  type MiniAppProvider,
} from "./provider.js";

/** CrackPay hosts a Mini App may trust. Testnet today; the production domain will be added here. */
export const CRACKPAY_ORIGINS: readonly string[] = ["https://crackpay.vercel.app"];

export type CrackPayOptions = {
  /**
   * CrackPay hosts to accept. Defaults to `CRACKPAY_ORIGINS`. Add
   * "http://localhost:3000" only if you run CrackPay itself locally.
   */
  hostOrigins?: readonly string[];
  /** How long to wait for CrackPay to answer before resolving null. Default 3000 ms. */
  timeoutMs?: number;
};

/**
 * Resolves with the wallet provider when this page is running inside CrackPay,
 * and with null in an ordinary browser tab or on a server. Safe to call from
 * many places: the connection is made once.
 */
export function getCrackPayProvider(options: CrackPayOptions = {}): Promise<MiniAppProvider | null> {
  return installCrackPayProvider({
    hostOrigins: options.hostOrigins ?? CRACKPAY_ORIGINS,
    timeoutMs: options.timeoutMs,
  });
}

/** True when the page is inside a frame, which is the only place CrackPay can be. Synchronous. */
export function isFramed(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

/** The network CrackPay runs on. */
export const arcTestnet = {
  id: 5042002,
  hexId: "0x4cef52",
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://explorer.testnet.arc.io",
  faucetUrl: "https://faucet.circle.com",
} as const;

/**
 * Tokens on Arc Testnet, through their ERC-20 interfaces. USDC is also Arc's
 * native gas token: the same balance, with 18 decimals when sent as a
 * transaction `value`. Use 6 for every token call and for display.
 */
export const tokens = {
  USDC: { symbol: "USDC", address: "0x3600000000000000000000000000000000000000", decimals: 6 },
  EURC: { symbol: "EURC", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
} as const;

/** Decimals of USDC when it is the `value` of a transaction or the result of `eth_getBalance`. */
export const NATIVE_USDC_DECIMALS = 18;

/** Error codes a CrackPay request can reject with. Match on these, never on message text. */
export const ErrorCode = {
  /** The user cancelled the confirmation or the passkey prompt. */
  UserRejected: 4001,
  /** The call is not allowed for this app: a contract outside its listing, or a forbidden token call. */
  Unauthorized: 4100,
  UnsupportedMethod: 4200,
  /** Only Arc is available. */
  UnrecognizedChain: 4902,
  InvalidParams: -32602,
  /** The call reverted, was never confirmed, or something failed inside CrackPay. */
  Internal: -32603,
} as const;

/** The numeric code of a provider error, looking through one level of wrapping (as viem and wagmi add). */
export function errorCode(error: unknown): number | undefined {
  for (const candidate of [error, (error as { cause?: unknown } | null)?.cause]) {
    const code = (candidate as { code?: unknown } | null | undefined)?.code;
    if (typeof code === "number") return code;
  }
  return undefined;
}

/** True when the user said no. Show "Cancelled" and let them try again. */
export function isUserRejection(error: unknown): boolean {
  return errorCode(error) === ErrorCode.UserRejected;
}

/** Who the user is in CrackPay. */
export type CrackPayUser = {
  account: `0x${string}`;
  /** Their CrackPay handle without the "@", or null if they have none. Public on-chain. */
  handle: string | null;
};

/**
 * The user's CrackPay account and handle. Never prompts. Use the handle to greet
 * them or to show who they are paying as; the account is still their identity.
 */
export async function getCrackPayUser(provider: MiniAppProvider): Promise<CrackPayUser> {
  const result = (await provider.request({ method: "crackpay_getProfile" })) as Partial<CrackPayUser> | null;
  if (!result || typeof result.account !== "string") throw new Error("CrackPay returned no account");
  return { account: result.account, handle: typeof result.handle === "string" && result.handle ? result.handle : null };
}
