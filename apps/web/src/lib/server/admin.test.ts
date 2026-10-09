import { beforeEach, describe, expect, it } from "vitest";
import { checkAdminPassword, passwordMatches, reviewSubmission, saveMiniAppFromInput } from "./admin";
import { ApiError, ServerConfigError } from "./errors";
import { MemoryStore } from "./store";
import { signToken, verifyToken } from "./tokens";

const PASSWORD = "correct horse battery staple";
const app = {
  id: "kashlink",
  name: "KashLink",
  tagline: "Send USDC or EURC as a link.",
  publisher: "Cracked Studios",
  category: "finance",
  url: "https://arc.kashlink.live/",
  network: "arc-testnet",
  contracts: [{ address: "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62", name: "KashLinkEscrow" }],
  tokenApprovals: ["EURC"],
  enabled: true,
  sortOrder: 0,
};

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error.code;
    throw error;
  }
  return undefined;
}

describe("admin sign-in", () => {
  it("accepts the right password and nothing else", async () => {
    await checkAdminPassword(store, PASSWORD, PASSWORD, "1.1.1.1");
    expect(await code(checkAdminPassword(store, PASSWORD, "wrong", "1.1.1.1"))).toBe("wrong_password");
    expect(await code(checkAdminPassword(store, PASSWORD, "", "1.1.1.1"))).toBe("wrong_password");
    expect(passwordMatches(PASSWORD, `${PASSWORD} `)).toBe(false);
  });

  it("refuses to run with a missing or weak configured password", async () => {
    await expect(checkAdminPassword(store, undefined, "x", "1.1.1.1")).rejects.toBeInstanceOf(ServerConfigError);
    await expect(checkAdminPassword(store, "short", "short", "1.1.1.1")).rejects.toBeInstanceOf(ServerConfigError);
  });

  it("locks an address out after ten attempts, even if the eleventh is right", async () => {
    for (let i = 0; i < 10; i++) await code(checkAdminPassword(store, PASSWORD, "wrong", "2.2.2.2"));
    expect(await code(checkAdminPassword(store, PASSWORD, PASSWORD, "2.2.2.2"))).toBe("rate_limited");
    await checkAdminPassword(store, PASSWORD, PASSWORD, "3.3.3.3");
  });

  it("does not accept a user session token as an admin token", () => {
    const session = signToken("secret", { typ: "session", userId: "u1" }, 60);
    expect(verifyToken("secret", session, "admin")).toBeNull();
    expect(verifyToken("secret", signToken("secret", { typ: "admin" }, 60), "admin")).toEqual(expect.objectContaining({ typ: "admin" }));
  });
});

describe("saveMiniAppFromInput", () => {
  it("creates an app, then refuses to create the same id again", async () => {
    await saveMiniAppFromInput(store, app);
    expect((await store.getMiniApp("kashlink"))?.name).toBe("KashLink");
    expect(await code(saveMiniAppFromInput(store, app))).toBe("id_taken");
  });

  it("edits in place and will not rename an app", async () => {
    await saveMiniAppFromInput(store, app);
    await saveMiniAppFromInput(store, { ...app, enabled: false, tagline: "Off for now." }, "kashlink");
    expect(await store.getMiniApp("kashlink")).toMatchObject({ enabled: false, tagline: "Off for now." });
    expect(await code(saveMiniAppFromInput(store, { ...app, id: "other" }, "kashlink"))).toBe("invalid_miniapp");
    expect(await store.listMiniApps()).toHaveLength(1);
  });

  it("only lists apps for the network this CrackPay runs on", async () => {
    expect(await code(saveMiniAppFromInput(store, { ...app, network: "arc-mainnet" }))).toBe("invalid_miniapp");
    expect(await store.getMiniApp("kashlink")).toBeNull();
    const seeded = new MemoryStore(Date.now, [{ ...app, network: "arc-mainnet", icon: null } as never]);
    expect(await seeded.listMiniApps()).toEqual([]);
  });

  it("stores nothing when the input is invalid", async () => {
    expect(await code(saveMiniAppFromInput(store, { ...app, url: "http://insecure.example" }))).toBe("invalid_miniapp");
    expect(await store.listMiniApps()).toEqual([]);
  });
});

describe("reviewSubmission", () => {
  it("records a decision and notes, and rejects bad input", async () => {
    const id = await store.saveSubmission({ contact: "dev@example.com", listing: { name: "X" } });
    await reviewSubmission(store, id, "rejected", "  Contract is not verified. ");
    expect(await store.getSubmission(id)).toMatchObject({ status: "rejected", reviewNotes: "Contract is not verified." });

    await reviewSubmission(store, id, "approved", "");
    expect(await store.getSubmission(id)).toMatchObject({ status: "approved", reviewNotes: null });

    expect(await code(reviewSubmission(store, id, "published", null))).toBe("invalid_request");
    expect(await code(reviewSubmission(store, "missing", "approved", null))).toBe("not_found");
  });
});
