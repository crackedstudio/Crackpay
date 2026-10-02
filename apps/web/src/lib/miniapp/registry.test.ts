import { describe, expect, it } from "vitest";
import { RegistryInputError, frameSources, parseMiniAppInput, toMiniApp, visibleMiniApps, type MiniAppRecord } from "./registry";

const ESCROW = "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62";

const valid = {
  id: "kashlink",
  name: "KashLink",
  tagline: "Send USDC or EURC as a link.",
  publisher: "Cracked Studios",
  category: "finance",
  url: "https://arc.kashlink.live/",
  icon: "",
  network: "arc-testnet",
  contracts: [{ address: ESCROW, name: "KashLinkEscrow" }],
  tokenApprovals: ["EURC"],
  enabled: true,
  sortOrder: 0,
};

function problem(change: Record<string, unknown>): string | undefined {
  try {
    parseMiniAppInput({ ...valid, ...change });
  } catch (error) {
    if (error instanceof RegistryInputError) return error.message;
    throw error;
  }
  return undefined;
}

const record = (change: Partial<MiniAppRecord> = {}): MiniAppRecord => ({ ...parseMiniAppInput(valid), ...change });

describe("parseMiniAppInput", () => {
  it("accepts a complete app and normalises it", () => {
    const app = parseMiniAppInput({ ...valid, name: "  KashLink ", tokenApprovals: ["EURC", "EURC"] });
    expect(app).toMatchObject({ id: "kashlink", name: "KashLink", icon: null, tokenApprovals: ["EURC"], enabled: true });
  });

  it("defaults to switched off, so saving never publishes by accident", () => {
    expect(parseMiniAppInput({ ...valid, enabled: undefined }).enabled).toBe(false);
  });

  it.each([
    [{ id: "test" }, "reserved"],
    [{ id: "Kash Link" }, "id must be"],
    [{ id: "a" }, "id must be"],
    [{ id: "-kash" }, "id must be"],
    [{ name: "" }, "name is required"],
    [{ url: "http://arc.kashlink.live" }, "url must be an https:// URL"],
    [{ url: "javascript:alert(1)" }, "url must be an https:// URL"],
    [{ icon: "http://x.example/i.png" }, "icon must be an https:// URL"],
    [{ category: "casino" }, "category must be one of"],
    [{ network: "ethereum" }, "network must be one of"],
    [{ contracts: "none" }, "contracts must be a list"],
    [{ contracts: [{ address: "0x12", name: "x" }] }, "contracts[0].address must be a contract address"],
    [{ contracts: [{ address: ESCROW, name: "" }] }, "name is required"],
    [{ contracts: [{ address: ESCROW, name: "a" }, { address: ESCROW.toLowerCase(), name: "b" }] }, "twice"],
    [{ tokenApprovals: ["USDT"] }, "tokenApprovals must be one of"],
    [{ contracts: [], tokenApprovals: ["USDC"] }, "needs at least one contract"],
    [{ sortOrder: 1.5 }, "sortOrder must be a whole number"],
    [{ enabled: "yes" }, "enabled must be true or false"],
  ])("rejects %j", (change, message) => {
    expect(problem(change)).toContain(message);
  });
});

describe("toMiniApp", () => {
  it("turns contracts and token names into the policy the bridge enforces", () => {
    const app = toMiniApp(record());
    expect(app.policy.contracts).toEqual([ESCROW]);
    expect(app.policy.tokens).toEqual([{ symbol: "EURC", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" }]);
    expect(app.policy.unrestricted).toBeUndefined();
    expect(app.test).toBeUndefined();
    expect(app.description).toBe("Send USDC or EURC as a link.");
  });
});

describe("visibleMiniApps", () => {
  it("hides apps that are switched off or on another network, and orders the rest", () => {
    const apps = visibleMiniApps([
      record({ id: "zeta", name: "Zeta", sortOrder: 0 }),
      record({ id: "off", enabled: false }),
      record({ id: "mainnet", network: "arc-mainnet" }),
      record({ id: "first", name: "Later name", sortOrder: -1 }),
      record({ id: "alpha", name: "Alpha", sortOrder: 0 }),
    ]);
    expect(apps.map((app) => app.id)).toEqual(["first", "alpha", "zeta"]);
  });
});

describe("frameSources", () => {
  const apps = [record(), record({ id: "off", url: "https://off.example/", enabled: false })];

  it("lets an app's page frame exactly that app's origin", () => {
    expect(frameSources("/apps/kashlink", apps)).toBe("https://arc.kashlink.live");
    expect(frameSources("/apps/kashlink/", apps)).toBe("https://arc.kashlink.live");
  });

  it("frames nothing for an app that is off, unknown, or on another path", () => {
    expect(frameSources("/apps/off", apps)).toBe("'self'");
    expect(frameSources("/apps/unknown", apps)).toBe("'self'");
    expect(frameSources("/apps", apps)).toBe("'self'");
    expect(frameSources("/apps/kashlink/extra", apps)).toBe("'self'");
  });

  it("opens up only the Developer mode route", () => {
    expect(frameSources("/apps/test", apps)).toBe("https: http://localhost:* http://127.0.0.1:*");
  });
});
