import { installCrackPayProvider, type MiniAppProvider } from "./provider.js";

export {
  PROTOCOL_VERSION,
  ProviderRpcError,
  WALLET_INFO,
  installCrackPayProvider,
  type MiniAppProvider,
} from "./provider.js";

/** CrackPay hosts a Mini App may trust: crackpay.xyz on Arc mainnet, crackpay.vercel.app on Arc Testnet. */
export const CRACKPAY_ORIGINS: readonly string[] = ["https://crackpay.xyz", "https://crackpay.vercel.app"];

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

/**
 * Arc Testnet. Test USDC from the faucet; build and review your app here first.
 * Endpoints: https://docs.arc.io/arc/references/connect-to-arc
 */
export const arcTestnet = {
  id: 5042002,
  hexId: "0x4cef52",
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://explorer.testnet.arc.io",
  faucetUrl: "https://faucet.circle.com",
  testnet: true,
} as const;

/** Arc mainnet. Real USDC. */
export const arcMainnet = {
  id: 5042,
  hexId: "0x13b2",
  name: "Arc",
  rpcUrl: "https://rpc.mainnet.arc.io",
  explorerUrl: "https://explorer.arc.io",
  faucetUrl: null,
  testnet: false,
} as const;

/** The networks CrackPay runs on. Each CrackPay deployment is on exactly one. */
export const ARC_CHAINS = [arcMainnet, arcTestnet] as const;

export type ArcChainInfo = (typeof ARC_CHAINS)[number];

/**
 * The Arc network for a chain id, as a number or the hex string `eth_chainId`
 * returns. Null for any other chain.
 */
export function getArcChain(chainId: number | string): ArcChainInfo | null {
  const id = typeof chainId === "string" ? Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10) : chainId;
  return ARC_CHAINS.find((chain) => chain.id === id) ?? null;
}

type Token = { symbol: "USDC" | "EURC"; address: `0x${string}`; decimals: 6 };

/**
 * Tokens on each Arc network, through their ERC-20 interfaces. USDC is also
 * Arc's native gas token: the same balance, with 18 decimals when sent as a
 * transaction `value`. Use 6 for every token call and for display.
 * Source: https://docs.arc.io/arc/references/contract-addresses
 */
export const tokensByChain = {
  [arcTestnet.id]: {
    USDC: { symbol: "USDC", address: "0x3600000000000000000000000000000000000000", decimals: 6 },
    EURC: { symbol: "EURC", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
  },
  [arcMainnet.id]: {
    USDC: { symbol: "USDC", address: "0x3600000000000000000000000000000000000000", decimals: 6 },
    EURC: { symbol: "EURC", address: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1", decimals: 6 },
  },
} as const satisfies Record<number, Record<"USDC" | "EURC", Token>>;

/**
 * The tokens on the network your app is running on. Read the chain from the
 * provider (`eth_chainId`) or from `connectCrackPay`, never assume it: EURC's
 * address differs between mainnet and testnet.
 */
export function getTokens(chainId: number | string) {
  const chain = getArcChain(chainId);
  return chain ? tokensByChain[chain.id] : null;
}

/** @deprecated Testnet only. Use `getTokens(chainId)`, which also covers mainnet. */
export const tokens = tokensByChain[arcTestnet.id];

/** Decimals of USDC when it is the `value` of a transaction or the result of `eth_getBalance`. */
export const NATIVE_USDC_DECIMALS = 18;

/** Error codes a CrackPay request can reject with. Match on these, never on message text. */
export const ErrorCode = {
  /** The user cancelled the confirmation or the passkey prompt. */
  UserRejected: 4001,
  /** The call is not allowed for this app: a contract outside its listing, or a forbidden token call. */
  Unauthorized: 4100,
  UnsupportedMethod: 4200,
  /** Only the Arc network this CrackPay runs on is available. */
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
