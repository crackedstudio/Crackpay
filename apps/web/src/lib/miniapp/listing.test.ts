import { describe, expect, it } from "vitest";
import { LISTING_TEMPLATE, ListingError, parseListing } from "./listing";

const valid = {
  name: "KashLink",
  tagline: "Send USDC or EURC as a link.",
  publisher: "Cracked Studios",
  category: "finance",
  url: "https://arc.kashlink.live/",
  icon: "https://arc.kashlink.live/icon-512.png",
  supportUrl: "mailto:help@kashlink.live",
  termsUrl: "https://arc.kashlink.live/terms",
  privacyUrl: "https://arc.kashlink.live/privacy",
  network: "arc-testnet",
  contracts: [
    {
      address: "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62",
      name: "KashLinkEscrow",
      purpose: "Holds the funds for each link.",
      explorerUrl: "https://explorer.testnet.arc.io/address/0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62",
      sampleTransactions: ["https://explorer.testnet.arc.io/tx/0xabc"],
    },
  ],
  tokenApprovals: ["EURC", "EURC"],
  origins: ["https://arc.kashlink.live/some/path", "https://api.kashlink.live"],
};

function problem(change: Record<string, unknown>): string | undefined {
  try {
    parseListing({ ...valid, ...change });
  } catch (error) {
    if (error instanceof ListingError) return error.message;
    throw error;
  }
  return undefined;
}

describe("parseListing", () => {
  it("accepts a complete listing and normalises it", () => {
    const listing = parseListing(valid);
    expect(listing.name).toBe("KashLink");
    expect(listing.tokenApprovals).toEqual(["EURC"]);
    expect(listing.origins).toEqual(["https://arc.kashlink.live", "https://api.kashlink.live"]);
    expect(listing.contracts[0]?.address).toBe("0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62");
  });

  it("accepts both networks and an app with no contracts", () => {
    expect(parseListing({ ...valid, network: "arc-mainnet" }).network).toBe("arc-mainnet");
    expect(parseListing({ ...valid, contracts: [], tokenApprovals: [] }).contracts).toEqual([]);
  });

  it.each([
    [{ name: "" }, "name is required"],
    [{ name: "x".repeat(41) }, "name must be at most 40 characters"],
    [{ tagline: undefined }, "tagline is required"],
    [{ category: "gambling" }, "category must be one of"],
    [{ url: "http://arc.kashlink.live" }, "url must be an https:// URL"],
    [{ url: "javascript:alert(1)" }, "url must be an https:// URL"],
    [{ icon: "not a url" }, "icon must be an https:// URL"],
    [{ supportUrl: "ftp://x" }, "supportUrl must be an https:// or mailto: link"],
    [{ network: "ethereum" }, "network must be one of"],
    [{ contracts: "0x4d6c" }, "contracts must be a list"],
    [{ contracts: [{ ...valid.contracts[0], address: "0x123" }] }, "contracts[0].address must be a contract address"],
    [{ contracts: [{ ...valid.contracts[0], purpose: "" }] }, "purpose is required"],
    [{ contracts: [{ ...valid.contracts[0], explorerUrl: "nope" }] }, "contracts[0].explorerUrl must be an https:// URL"],
    [{ contracts: [valid.contracts[0], { ...valid.contracts[0], address: valid.contracts[0]?.address.toLowerCase() }] }, "twice"],
    [{ contracts: Array.from({ length: 21 }, () => valid.contracts[0]) }, "contracts can have at most 20 entries"],
    [{ tokenApprovals: ["USDT"] }, "tokenApprovals must be one of: USDC, EURC"],
    [{ contracts: [], tokenApprovals: ["USDC"] }, "tokenApprovals needs at least one contract"],
    [{ origins: ["http://insecure.example"] }, "origins[0] must be an https:// URL"],
  ])("rejects %j", (change, message) => {
    expect(problem(change)).toContain(message);
  });

  it("rejects anything that is not an object", () => {
    for (const input of [null, "text", 5, [valid]]) {
      expect(() => parseListing(input)).toThrow(ListingError);
    }
  });

  it("ships a template that is valid JSON and fails validation until filled in", () => {
    expect(() => parseListing(JSON.parse(LISTING_TEMPLATE))).toThrow(ListingError);
  });
});
