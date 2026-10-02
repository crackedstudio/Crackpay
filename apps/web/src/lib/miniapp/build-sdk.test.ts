import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { buildSdkScript } from "./build-sdk";
import { envelope, isMiniAppMessage, type MiniAppProvider } from "./sdk";

const published = readFileSync("public/miniapp-sdk.js", "utf8");
const HOST = "https://crackpay.example";

type Listener = (event: unknown) => void;

/** A minimal browser window for the published script to run in. */
function fakeWindow(options: { framed: boolean; scriptSrc?: string; hostOrigins?: string }) {
  const listeners = new Map<string, Set<Listener>>();
  const posted: { message: unknown; targetOrigin: string }[] = [];
  const dispatched: { type: string; detail?: unknown }[] = [];

  const parent = {
    postMessage(message: unknown, targetOrigin: string) {
      posted.push({ message, targetOrigin });
    },
  };
  const window: Record<string, unknown> = {
    addEventListener: (type: string, listener: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, listener: Listener) => listeners.get(type)?.delete(listener),
    dispatchEvent: (event: { type: string; detail?: unknown }) => {
      dispatched.push(event);
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
  };
  window.parent = options.framed ? parent : window;

  const context = vm.createContext({
    window,
    document: {
      currentScript: {
        src: options.scriptSrc ?? `${HOST}/miniapp-sdk.js`,
        getAttribute: (name: string) => (name === "data-host-origins" ? (options.hostOrigins ?? null) : null),
      },
    },
    URL,
    crypto,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    CustomEvent: class {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  });

  /** Delivers a message to the page as if `source` had posted it from `origin`. */
  const receive = (data: unknown, origin: string, source: unknown = parent) => {
    for (const listener of listeners.get("message") ?? []) listener({ data, origin, source });
  };
  const api = () => window.crackpay as { version: number; ready: Promise<MiniAppProvider | null> };
  return { context, window, posted, dispatched, receive, api };
}

describe("published SDK script", () => {
  it("matches the current sdk.ts (run `pnpm build:sdk` if this fails)", () => {
    expect(published).toBe(buildSdkScript(readFileSync("src/lib/miniapp/sdk.ts", "utf8")));
  });

  it("resolves to null in an ordinary tab and leaves window.ethereum alone", async () => {
    const page = fakeWindow({ framed: false });
    vm.runInContext(published, page.context);
    expect(page.api().version).toBe(1);
    expect(await page.api().ready).toBeNull();
    expect(page.window.ethereum).toBeUndefined();
  });

  it("greets only the origin it was loaded from, then connects when that host answers", async () => {
    const page = fakeWindow({ framed: true });
    vm.runInContext(published, page.context);

    expect(page.posted[0]?.targetOrigin).toBe(HOST);
    expect(isMiniAppMessage(page.posted[0]?.message) && page.posted[0]?.message).toMatchObject({ type: "hello" });

    // Answers from another origin, or from another window, are ignored.
    page.receive(envelope({ type: "ready", chainId: "0x4cef52", accounts: [] }), "https://evil.example");
    page.receive(envelope({ type: "ready", chainId: "0x4cef52", accounts: [] }), HOST, {});
    expect(page.window.ethereum).toBeUndefined();

    page.receive(envelope({ type: "ready", chainId: "0x4cef52", accounts: [] }), HOST);
    const provider = await page.api().ready;
    expect(provider?.isCrackPay).toBe(true);
    expect(page.window.ethereum).toBe(provider);
    expect(page.dispatched.some((event) => event.type === "eip6963:announceProvider")).toBe(true);

    // A request goes to the host that answered, and its response resolves the call.
    const request = provider?.request({ method: "eth_chainId" });
    const sent = page.posted.at(-1);
    expect(sent?.targetOrigin).toBe(HOST);
    const id = (sent?.message as { id: number }).id;
    page.receive(envelope({ type: "response", id, result: "0x4cef52" }), HOST);
    expect(await request).toBe("0x4cef52");
  });

  it("honours data-host-origins for a self-hosted copy", () => {
    const page = fakeWindow({ framed: true, scriptSrc: "https://my-app.example/vendor/sdk.js", hostOrigins: "https://a.example, https://b.example" });
    vm.runInContext(published, page.context);
    expect(page.posted.slice(0, 2).map((entry) => entry.targetOrigin)).toEqual(["https://a.example", "https://b.example"]);
  });
});
