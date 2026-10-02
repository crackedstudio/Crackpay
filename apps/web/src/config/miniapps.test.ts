import { describe, expect, it } from "vitest";
import { findMiniApp, miniApps, testMiniApp, testUrlProblem } from "./miniapps";

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

describe("testUrlProblem", () => {
  it("has nothing to say about a URL that loads", () => {
    for (const url of ["https://my-app.vercel.app", "https://192.168.1.5:5173", "http://localhost:5173"]) {
      expect(testUrlProblem(url)).toBeNull();
      expect(testMiniApp(url)).not.toBeNull();
    }
  });

  it("explains an insecure network address, and anything else it refuses", () => {
    expect(testUrlProblem("http://192.168.1.5:5173")).toContain("not secure");
    expect(testUrlProblem("my-app.vercel.app")).toContain("https://");
    expect(testUrlProblem("ftp://x.example")).toContain("https://");
    for (const url of ["http://192.168.1.5:5173", "my-app.vercel.app", "ftp://x.example"]) {
      expect(testMiniApp(url)).toBeNull();
    }
  });
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
