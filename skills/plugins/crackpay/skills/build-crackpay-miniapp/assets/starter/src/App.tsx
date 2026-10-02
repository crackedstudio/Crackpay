import { isUserRejection, tokens } from "@crackpay/miniapp-sdk";
import { useCrackPay } from "@crackpay/miniapp-sdk/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatUnits, isAddress, parseEther, type Hash } from "viem";
import { explorerTx, readUsdcBalance, sendUsdc } from "./crackpay";

export function App() {
  // Connects on load. There is no "Connect wallet" button in a Mini App.
  const crackpay = useCrackPay();

  if (crackpay.status === "connecting") return <p className="center">Loading…</p>;
  if (crackpay.status === "unavailable") {
    return (
      <div className="center">
        <h1>Open this app in CrackPay</h1>
        <p>It uses your CrackPay balance, so it only works inside CrackPay.</p>
      </div>
    );
  }
  if (crackpay.status === "error") return <p className="center">Something went wrong. Close the app and open it again.</p>;

  return <Home provider={crackpay.provider} account={crackpay.account} />;
}

type Connected = Extract<ReturnType<typeof useCrackPay>, { status: "connected" }>;

function Home({ provider, account }: Pick<Connected, "provider" | "account">) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Hash | null>(null);

  const refresh = useCallback(() => {
    readUsdcBalance(account).then(setBalance, (error: unknown) => console.error("Balance read failed", error));
  }, [account]);

  useEffect(refresh, [refresh]);

  // A demo payment: 0.01 USDC to an address. Replace it with a call to your own
  // contract. Once your app is listed, only the contracts in your listing can be
  // called, so a plain send like this one only works in Developer mode.
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!isAddress(to)) return setMessage("Enter a valid address.");

    setSending(true);
    setMessage(null);
    setReceipt(null);
    try {
      setReceipt(await sendUsdc(provider, account, to, parseEther("0.01")));
      refresh();
    } catch (error) {
      console.error(error);
      setMessage(isUserRejection(error) ? "Cancelled." : "The payment didn't go through. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      <h1>My Mini App</h1>

      <section className="card">
        <span className="label">Your balance</span>
        <span className="balance">
          {balance === null ? "$—" : `$${Number(formatUnits(balance, tokens.USDC.decimals)).toFixed(2)}`}
        </span>
        <span className="label mono">{account}</span>
      </section>

      <form className="card" onSubmit={pay}>
        <label className="label" htmlFor="to">
          Send $0.01 to
        </label>
        <input
          id="to"
          placeholder="0x…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <button disabled={sending || !to}>{sending ? "Waiting for CrackPay…" : "Send"}</button>
        {message && <p role="alert">{message}</p>}
        {receipt && (
          <p>
            Sent.{" "}
            <a href={explorerTx(receipt)} target="_blank" rel="noreferrer">
              View receipt
            </a>
          </p>
        )}
      </form>
    </main>
  );
}
