"use client";

import { useCallback, useEffect, useState } from "react";
import { erc20Abi, type Address } from "viem";
import { contracts } from "@/config/contracts";
import { arcChain, publicClient } from "./arc";

const REFRESH_MS = 8_000;

/**
 * The account's one USDC balance, in 6-decimal base units, read through the
 * ERC-20 interface. Native and ERC-20 USDC are the same money on Arc, so this
 * is the only balance there is. Null until the first read lands.
 */
export function useUsdcBalance(address: Address): { balance: bigint | null; refresh: () => void } {
  const [balance, setBalance] = useState<bigint | null>(null);

  const refresh = useCallback(() => {
    if (process.env.NEXT_PUBLIC_DEMO === "1") { setBalance(1240500000n); return; }
    publicClient
      .readContract({ address: contracts[arcChain.id].usdc, abi: erc20Abi, functionName: "balanceOf", args: [address] })
      .then(setBalance, (error: unknown) => console.error("Balance read failed", error));
  }, [address]);

  useEffect(() => {
    const initialRefresh = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initialRefresh);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { balance, refresh };
}
