// Regenerates the skills discovery files from /skills:
//   skills/manifest.json and public/.well-known/agent-skills/
//
//   pnpm build:skills
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildSkillsIndex } from "../src/lib/miniapp/skills-index.ts";

const repo = "../..";
rmSync("public/.well-known/agent-skills", { recursive: true, force: true });
const files = buildSkillsIndex();
for (const [path, content] of files) {
  const target = join(repo, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
console.log(`${files.size} skills discovery files written`);
