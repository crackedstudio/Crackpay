import { describe, expect, it } from "vitest";
import { findMiniApp, miniApps, testMiniApp } from "./miniapps";

describe("testMiniApp", () => {
  it.each(["https://my-app.example.com", "https://abc123.ngrok-free.dev/path?x=1", "http://localhost:5173", "http://127.0.0.1:3001/"])(
    "accepts %s",
    (url) => {
      const app = testMiniApp(url);
      expect(app).toMatchObject({ id: "test", test: true, policy: { unrestricted: true, contracts: [] } });
      expect(app?.name).toBe(new URL(url).host);
    },
  );

  it.each(["http://my-app.example.com", "http://192.168.1.5:3000", "javascript:alert(1)", "data:text/html,hi", "ftp://x.example", "not a url", ""])(
    "rejects %j",
    (url) => {
      expect(testMiniApp(url)).toBeNull();
    },
  );
});

describe("registry", () => {
  it("never marks a listed app as a test app or unrestricted", () => {
    for (const app of miniApps) {
      expect(app.test).toBeUndefined();
      expect(app.policy.unrestricted).toBeUndefined();
    }
  });

  it("does not resolve the reserved test id", () => {
    expect(findMiniApp("test")).toBeUndefined();
  });
});
