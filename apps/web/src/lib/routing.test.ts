import { describe, expect, it } from "vitest";
import { currentPath, safeNext, withNext } from "./routing";

describe("safeNext", () => {
  it("keeps a path on this app", () => {
    expect(safeNext("/send?to=sam")).toBe("/send?to=sam");
  });

  it("drops anything missing or off-site", () => {
    for (const value of [null, undefined, "", "send", "https://evil.test/x", "//evil.test/x"]) {
      expect(safeNext(value)).toBeNull();
    }
  });
});

describe("withNext", () => {
  it("attaches an encoded destination", () => {
    expect(withNext("/signin", "/send?to=sam")).toBe("/signin?next=%2Fsend%3Fto%3Dsam");
  });

  it("leaves the destination off when there is nothing safe to carry", () => {
    expect(withNext("/signin", null)).toBe("/signin");
    expect(withNext("/signin", "https://evil.test")).toBe("/signin");
  });
});

describe("currentPath", () => {
  it("is the path and query, without the origin", () => {
    expect(currentPath({ pathname: "/send", search: "?to=sam" })).toBe("/send?to=sam");
    expect(currentPath({ pathname: "/receive", search: "" })).toBe("/receive");
  });
});
