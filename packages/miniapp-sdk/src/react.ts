import { useEffect, useState } from "react";
import { getCrackPayProvider, getCrackPayUser, type CrackPayOptions, type MiniAppProvider } from "./index.js";

export type CrackPayState =
  /** Still finding out. Show a loading state, not a "connect" button. */
  | { status: "connecting" }
  | {
      status: "connected";
      provider: MiniAppProvider;
      account: `0x${string}`;
      /** Their CrackPay handle without the "@", or null if they have none. */
      handle: string | null;
    }
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
      const { account, handle } = await getCrackPayUser(provider);
      return { status: "connected", provider, account, handle } as const;
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
