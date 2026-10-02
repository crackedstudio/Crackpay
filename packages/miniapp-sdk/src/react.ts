import { useEffect, useState } from "react";
import { getCrackPayProvider, type CrackPayOptions, type MiniAppProvider } from "./index.js";

export type CrackPayState =
  /** Still finding out. Show a loading state, not a "connect" button. */
  | { status: "connecting" }
  | { status: "connected"; provider: MiniAppProvider; account: `0x${string}` }
  /** Not inside CrackPay. Ask the user to open the app from CrackPay. */
  | { status: "unavailable" }
  | { status: "error"; error: unknown };

/**
 * Connects to CrackPay on mount and reports the result. There is nothing for
 * the user to click: inside CrackPay the wallet is already connected.
 *
 * Pass a stable `options` object (module-level or memoised), or omit it.
 */
export function useCrackPay(options?: CrackPayOptions): CrackPayState {
  const [state, setState] = useState<CrackPayState>({ status: "connecting" });

  useEffect(() => {
    let current = true;
    (async () => {
      const provider = await getCrackPayProvider(options);
      if (!provider) return { status: "unavailable" } as const;
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
      const account = accounts[0];
      if (!account) throw new Error("CrackPay returned no account");
      return { status: "connected", provider, account } as const;
    })().then(
      (next) => current && setState(next),
      (error: unknown) => current && setState({ status: "error", error }),
    );
    return () => {
      current = false;
    };
  }, [options]);

  return state;
}
