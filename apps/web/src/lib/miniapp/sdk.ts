// CrackPay Mini App SDK.
//
// A dependency-free EIP-1193 provider for web apps that run inside CrackPay.
// CrackPay loads a Mini App in an iframe; this module relays wallet requests to
// the CrackPay page over postMessage, and CrackPay signs with the user's
// passkey. The Mini App never sees a key.
//
// This file is self-contained on purpose: copy it into a Mini App as is.
//
//   const provider = await installCrackPayProvider({ hostOrigins: ["https://<crackpay host>"] });
//   if (provider) { /* running inside CrackPay; also announced through EIP-6963 */ }

export const PROTOCOL = "crackpay-miniapp";
export const PROTOCOL_VERSION = 1;

type Envelope = { protocol: typeof PROTOCOL; version: typeof PROTOCOL_VERSION };

export type HelloMessage = Envelope & { type: "hello" };
export type ReadyMessage = Envelope & { type: "ready"; chainId: string; accounts: string[] };
export type RequestMessage = Envelope & { type: "request"; id: number; method: string; params?: unknown };
export type ResponseMessage = Envelope & {
  type: "response";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
};
export type EventMessage = Envelope & { type: "event"; event: string; data: unknown };

export type MiniAppMessage = HelloMessage | ReadyMessage | RequestMessage | ResponseMessage | EventMessage;

/** True for any well-formed message of this protocol and version. */
export function isMiniAppMessage(value: unknown): value is MiniAppMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    message.protocol === PROTOCOL &&
    message.version === PROTOCOL_VERSION &&
    typeof message.type === "string"
  );
}

export function envelope<T extends object>(message: T): T & Envelope {
  return { protocol: PROTOCOL, version: PROTOCOL_VERSION, ...message };
}

/** EIP-1193 error: `code` follows EIP-1193 and EIP-1474. */
export class ProviderRpcError extends Error {
  override name = "ProviderRpcError";
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

type Listener = (data: unknown) => void;

export interface MiniAppProvider {
  readonly isCrackPay: true;
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on(event: string, listener: Listener): void;
  removeListener(event: string, listener: Listener): void;
}

/** How the provider reaches the host. Abstracted so it can be tested without a window. */
export interface Port {
  post(message: RequestMessage): void;
  /** Delivers host messages that have already passed source and origin checks. */
  subscribe(listener: (message: MiniAppMessage) => void): () => void;
}

export function createProvider(port: Port): MiniAppProvider {
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  const listeners = new Map<string, Set<Listener>>();
  let nextId = 1;

  port.subscribe((message) => {
    if (message.type === "response") {
      const waiting = pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      if (message.error) waiting.reject(new ProviderRpcError(message.error.code, message.error.message));
      else waiting.resolve(message.result);
    } else if (message.type === "event") {
      for (const listener of listeners.get(message.event) ?? []) listener(message.data);
    }
  });

  return {
    isCrackPay: true,
    request({ method, params }) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        port.post(envelope({ type: "request", id, method, params }));
      });
    },
    on(event, listener) {
      const set = listeners.get(event) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(event, set);
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
    },
  };
}

const ICON =
  "data:image/svg+xml;base64," +
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMjAiIGZpbGw9IiMwYTBhMGEiLz48dGV4dCB4PSI0OCIgeT0iNjIiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCIgZm9udC13ZWlnaHQ9IjcwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+QzwvdGV4dD48L3N2Zz4=";

export const WALLET_INFO = { name: "CrackPay", icon: ICON, rdns: "app.crackpay" } as const;

let installing: Promise<MiniAppProvider | null> | undefined;

/**
 * Connects to CrackPay when this page is running inside it.
 *
 * Resolves with a provider once a CrackPay host on one of `hostOrigins` has
 * answered, or with null when the page is not framed by CrackPay. The provider
 * is also announced through EIP-6963 and set as `window.ethereum` if nothing
 * else has claimed it. Safe to call more than once.
 */
export function installCrackPayProvider(options: {
  hostOrigins: readonly string[];
  /** How long to wait for the host before giving up. Default 3000 ms. */
  timeoutMs?: number;
}): Promise<MiniAppProvider | null> {
  installing ??= install(options.hostOrigins, options.timeoutMs ?? 3000);
  return installing;
}

function install(hostOrigins: readonly string[], timeoutMs: number): Promise<MiniAppProvider | null> {
  if (typeof window === "undefined" || window.parent === window || hostOrigins.length === 0) {
    return Promise.resolve(null);
  }
  const host = window.parent;

  return new Promise((resolve) => {
    // postMessage only delivers to a window whose origin matches the target, so
    // greeting every allowed origin reaches the real host and nobody else.
    const greet = () => {
      for (const origin of hostOrigins) host.postMessage(envelope({ type: "hello" }), origin);
    };

    const onReady = (event: MessageEvent) => {
      if (event.source !== host || !hostOrigins.includes(event.origin)) return;
      if (!isMiniAppMessage(event.data) || event.data.type !== "ready") return;
      cleanup();
      resolve(connect(host, event.origin));
    };
    const cleanup = () => {
      window.removeEventListener("message", onReady);
      clearInterval(retry);
      clearTimeout(giveUp);
    };

    window.addEventListener("message", onReady);
    const retry = setInterval(greet, 250);
    const giveUp = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    greet();
  });
}

function connect(host: Window, hostOrigin: string): MiniAppProvider {
  const provider = createProvider({
    post: (message) => host.postMessage(message, hostOrigin),
    subscribe(listener) {
      const onMessage = (event: MessageEvent) => {
        if (event.source !== host || event.origin !== hostOrigin) return;
        if (isMiniAppMessage(event.data)) listener(event.data);
      };
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    },
  });

  const detail = Object.freeze({ info: { uuid: crypto.randomUUID(), ...WALLET_INFO }, provider });
  const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
  window.addEventListener("eip6963:requestProvider", announce);
  announce();

  const global = window as unknown as { ethereum?: unknown };
  global.ethereum ??= provider;

  return provider;
}
