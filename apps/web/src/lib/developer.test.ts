import { describe, expect, it } from "vitest";
import { RECENT_LIMIT, withRecent } from "./developer";

describe("withRecent", () => {
  it("puts the newest first and drops duplicates", () => {
    expect(withRecent(["https://a.example", "https://b.example"], "https://b.example")).toEqual([
      "https://b.example",
      "https://a.example",
    ]);
  });

  it(`keeps at most ${RECENT_LIMIT}`, () => {
    const list = Array.from({ length: RECENT_LIMIT }, (_, i) => `https://${i}.example`);
    const next = withRecent(list, "https://new.example");
    expect(next).toHaveLength(RECENT_LIMIT);
    expect(next[0]).toBe("https://new.example");
    expect(next).not.toContain(`https://${RECENT_LIMIT - 1}.example`);
  });
});
