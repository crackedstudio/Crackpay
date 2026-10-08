import { describe, expect, it } from "vitest";
import { kashLinkAppUrl, parseKashLink } from "./kashlink";

const KEY = "a".repeat(64);

describe("parseKashLink", () => {
  it.each([
    [`https://testnet.kashlink.live/#${KEY}`, KEY],
    [`https://testnet.kashlink.live/#0x${KEY}`, `0x${KEY}`],
    [`https://testnet.kashlink.live/#${KEY}&m=Happy%20birthday`, `${KEY}&m=Happy%20birthday`],
    [`  https://TESTNET.kashlink.live/#${KEY}  `, KEY],
    [`#${KEY}`, KEY],
    [KEY.toUpperCase(), KEY.toUpperCase()],
  ])("accepts %s", (input, fragment) => {
    expect(parseKashLink(input)).toEqual({ ok: true, fragment });
  });

  it("recognises a mainnet link and says so", () => {
    expect(parseKashLink(`https://arc.kashlink.live/#${KEY}`)).toEqual({ ok: false, reason: "other_network" });
  });

  it("on mainnet, opens mainnet links and turns testnet ones away", () => {
    expect(parseKashLink(`https://arc.kashlink.live/#${KEY}`, "mainnet")).toEqual({ ok: true, fragment: KEY });
    expect(parseKashLink(`https://kashlink.live/#${KEY}`, "mainnet")).toEqual({ ok: true, fragment: KEY });
    expect(parseKashLink(`https://testnet.kashlink.live/#${KEY}`, "mainnet")).toEqual({
      ok: false,
      reason: "other_network",
    });
  });

  it.each([
    "",
    "hello",
    `https://testnet.kashlink.live/`,
    `https://testnet.kashlink.live/#${KEY.slice(1)}`,
    `https://testnet.kashlink.live/#${KEY}z`,
    `http://testnet.kashlink.live/#${KEY}`,
    `https://evil.example/#${KEY}`,
    `https://testnet.kashlink.live.evil.example/#${KEY}`,
    `javascript:alert(1)#${KEY}`,
  ])("rejects %j", (input) => {
    expect(parseKashLink(input)).toEqual({ ok: false, reason: "not_a_link" });
  });
});

describe("kashLinkAppUrl", () => {
  it("opens KashLink inside CrackPay, carrying the key only in the fragment", () => {
    expect(kashLinkAppUrl()).toBe("/apps/kashlink");
    expect(kashLinkAppUrl(KEY)).toBe(`/apps/kashlink#${KEY}`);
  });
});
