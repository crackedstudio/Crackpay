import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contracts } from "../../config/contracts";
import { arcChain } from "../arc";
import { UNLOCK_TAPS } from "../developer";
import { LISTING_CATEGORIES, LISTING_TEMPLATE } from "./listing";
import { buildSkillsIndex } from "./skills-index";

// The developer skills in /skills describe this wallet. These checks fail when
// the wallet changes and the skills would start teaching something untrue.

const root = "../../skills/plugins/crackpay";
const skillsDir = `${root}/skills`;
const names = readdirSync(skillsDir);
const read = (path: string) => readFileSync(path, "utf8");
const skill = (name: string) => read(`${skillsDir}/${name}/SKILL.md`);

describe("developer skills", () => {
  it("each have frontmatter naming the folder they live in", () => {
    expect(names.length).toBeGreaterThanOrEqual(6);
    for (const name of names) {
      const match = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(skill(name));
      expect(match?.[1], name).toBe(name);
      expect(match?.[2]?.length ?? 0, name).toBeGreaterThan(80);
      expect(match?.[2]?.length ?? Infinity, name).toBeLessThanOrEqual(1024);
    }
  });

  it("quote the chain and token addresses the wallet actually uses", () => {
    const facts = skill("build-crackpay-miniapp");
    expect(facts).toContain(String(arcChain.id));
    expect(facts).toContain(`0x${arcChain.id.toString(16)}`);
    expect(facts).toContain(contracts[arcChain.id].usdc);
    expect(facts).toContain(contracts[arcChain.id].eurc);

    // No skill may mention an address that is not a token on one of the Arc networks.
    const known = Object.values(contracts)
      .flatMap((set) => [set.usdc, set.eurc])
      .map((a) => a.toLowerCase());
    for (const set of Object.values(contracts)) expect(facts).toContain(set.eurc);
    for (const name of names) {
      const addresses = skill(name).match(/0x[0-9a-fA-F]{40}/g) ?? [];
      for (const address of addresses) expect(known, `${name}: ${address}`).toContain(address.toLowerCase());
    }
  });

  it("ship the same listing template and categories the submission form accepts", () => {
    const template = JSON.parse(read(`${skillsDir}/list-crackpay-miniapp/references/listing-template.json`)) as unknown;
    expect(template).toEqual(JSON.parse(LISTING_TEMPLATE));
    for (const category of LISTING_CATEGORIES) expect(skill("list-crackpay-miniapp")).toContain(`\`${category}\``);
  });

  it("give the Developer mode steps as the wallet implements them", () => {
    expect(UNLOCK_TAPS).toBe(7);
    expect(skill("test-crackpay-miniapp")).toContain("Tap the **Version** row seven times");
  });

  it("pin the starter to the SDK version in this repository", () => {
    const sdk = JSON.parse(read("../../packages/miniapp-sdk/package.json")) as { name: string; version: string };
    const starter = JSON.parse(read(`${skillsDir}/build-crackpay-miniapp/assets/starter/package.json`)) as {
      dependencies: Record<string, string>;
    };
    expect(starter.dependencies[sdk.name]).toBe(sdk.version);
    expect(skill("use-crackpay-sdk")).toContain(sdk.name);
    expect(read(`${skillsDir}/use-crackpay-sdk/references/api.md`)).toContain(`Version ${sdk.version}`);
  });

  it("document every method the bridge forwards to the node", async () => {
    const bridge = read("src/lib/miniapp/bridge.ts");
    const forwarded = /const READ_METHODS = new Set\(\[([\s\S]*?)\]\)/.exec(bridge)?.[1]?.match(/eth_\w+/g) ?? [];
    expect(forwarded.length).toBeGreaterThan(10);
    const api = read(`${skillsDir}/use-crackpay-sdk/references/api.md`);
    for (const method of forwarded) expect(api, method).toContain(`\`${method}\``);
  });

  it("publish discovery files that match the skills (run `pnpm build:skills` if this fails)", () => {
    for (const [path, content] of buildSkillsIndex()) {
      expect(read(`../../${path}`), path).toBe(content);
    }
  });

  it("list every skill and its SKILL.md in the well-known index", () => {
    const index = JSON.parse(read("public/.well-known/agent-skills/index.json")) as {
      skills: { name: string; files: string[] }[];
    };
    expect(index.skills.map((skill) => skill.name).sort()).toEqual([...names].sort());
    for (const skill of index.skills) {
      expect(skill.files[0]).toBe("SKILL.md");
      expect(skill.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
