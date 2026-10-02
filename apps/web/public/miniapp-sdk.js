/* CrackPay Mini App SDK. Generated from src/lib/miniapp/sdk.ts by "pnpm build:sdk". Do not edit. */
(function () {
  var script = document.currentScript;
  var exports = {};
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.WALLET_INFO = exports.ProviderRpcError = exports.PROTOCOL_VERSION = exports.PROTOCOL = void 0;
  exports.isMiniAppMessage = isMiniAppMessage;
  exports.envelope = envelope;
  exports.createProvider = createProvider;
  exports.installCrackPayProvider = installCrackPayProvider;
  exports.PROTOCOL = "crackpay-miniapp";
  exports.PROTOCOL_VERSION = 1;
  function isMiniAppMessage(value) {
      if (typeof value !== "object" || value === null)
          return false;
      const message = value;
      return (message.protocol === exports.PROTOCOL &&
          message.version === exports.PROTOCOL_VERSION &&
          typeof message.type === "string");
  }
  function envelope(message) {
      return { protocol: exports.PROTOCOL, version: exports.PROTOCOL_VERSION, ...message };
  }
  class ProviderRpcError extends Error {
      constructor(code, message) {
          super(message);
          this.name = "ProviderRpcError";
          this.code = code;
      }
  }
  exports.ProviderRpcError = ProviderRpcError;
  function createProvider(port) {
      const pending = new Map();
      const listeners = new Map();
      let nextId = 1;
      port.subscribe((message) => {
          if (message.type === "response") {
              const waiting = pending.get(message.id);
              if (!waiting)
                  return;
              pending.delete(message.id);
              if (message.error)
                  waiting.reject(new ProviderRpcError(message.error.code, message.error.message));
              else
                  waiting.resolve(message.result);
          }
          else if (message.type === "event") {
              for (const listener of listeners.get(message.event) ?? [])
                  listener(message.data);
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
              const set = listeners.get(event) ?? new Set();
              set.add(listener);
              listeners.set(event, set);
          },
          removeListener(event, listener) {
              listeners.get(event)?.delete(listener);
          },
      };
  }
  const ICON = "data:image/svg+xml;base64," +
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMjAiIGZpbGw9IiMwYTBhMGEiLz48dGV4dCB4PSI0OCIgeT0iNjIiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCIgZm9udC13ZWlnaHQ9IjcwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+QzwvdGV4dD48L3N2Zz4=";
  exports.WALLET_INFO = { name: "CrackPay", icon: ICON, rdns: "app.crackpay" };
  let installing;
  function installCrackPayProvider(options) {
      installing ?? (installing = install(options.hostOrigins, options.timeoutMs ?? 3000));
      return installing;
  }
  function install(hostOrigins, timeoutMs) {
      if (typeof window === "undefined" || window.parent === window || hostOrigins.length === 0) {
          return Promise.resolve(null);
      }
      const host = window.parent;
      return new Promise((resolve) => {
          const greet = () => {
              for (const origin of hostOrigins)
                  host.postMessage(envelope({ type: "hello" }), origin);
          };
          const onReady = (event) => {
              if (event.source !== host || !hostOrigins.includes(event.origin))
                  return;
              if (!isMiniAppMessage(event.data) || event.data.type !== "ready")
                  return;
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
  function connect(host, hostOrigin) {
      const provider = createProvider({
          post: (message) => host.postMessage(message, hostOrigin),
          subscribe(listener) {
              const onMessage = (event) => {
                  if (event.source !== host || event.origin !== hostOrigin)
                      return;
                  if (isMiniAppMessage(event.data))
                      listener(event.data);
              };
              window.addEventListener("message", onMessage);
              return () => window.removeEventListener("message", onMessage);
          },
      });
      const detail = Object.freeze({ info: { uuid: crypto.randomUUID(), ...exports.WALLET_INFO }, provider });
      const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
      const global = window;
      global.ethereum ?? (global.ethereum = provider);
      return provider;
  }

  var configured = script && script.getAttribute("data-host-origins");
  var origins = configured
    ? configured.split(",").map(function (origin) { return origin.trim(); }).filter(Boolean)
    : script && script.src
      ? [new URL(script.src).origin]
      : [];
  window.crackpay = {
    version: exports.PROTOCOL_VERSION,
    /** Resolves with the EIP-1193 provider inside CrackPay, or null in an ordinary tab. */
    ready: exports.installCrackPayProvider({ hostOrigins: origins }),
  };
})();
