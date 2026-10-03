import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Builds the discovery files for the developer skills in /skills, so agents can
// find them without cloning the repository:
//  - skills/manifest.json: a plain catalogue of the skills and their files.
//  - public/.well-known/agent-skills/: the Agent Skills well-known index
//    (index.json plus every file), served at
//    https://<crackpay>/.well-known/agent-skills/index.json and installable with
//    `npx skills add https://<crackpay>`.

export const SKILLS_ROOT = "../../skills";
const PLUGIN = "plugins/crackpay";

export type SkillEntry = { name: string; description: string; files: string[] };

function listFiles(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((entry) => {
      const path = join(dir, entry);
      return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

function frontmatter(skillMd: string): { name: string; description: string } {
  const match = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(skillMd);
  if (!match?.[1] || !match[2]) throw new Error("SKILL.md is missing its name or description");
  return { name: match[1].trim(), description: match[2].trim() };
}

export function readSkills(root = SKILLS_ROOT): SkillEntry[] {
  const skillsDir = join(root, PLUGIN, "skills");
  return readdirSync(skillsDir)
    .sort()
    .map((dir) => {
      const base = join(skillsDir, dir);
      const files = listFiles(base).map((path) => relative(base, path));
      // SKILL.md first: some readers expect it to lead.
      files.sort((a, b) => (a === "SKILL.md" ? -1 : b === "SKILL.md" ? 1 : a.localeCompare(b)));
      return { ...frontmatter(readFileSync(join(base, "SKILL.md"), "utf8")), files };
    });
}

/** Every generated file, as relative path → content. Paths are relative to the repository root. */
export function buildSkillsIndex(root = SKILLS_ROOT): Map<string, string> {
  const skills = readSkills(root);
  const plugin = JSON.parse(readFileSync(join(root, PLUGIN, ".claude-plugin/plugin.json"), "utf8")) as {
    name: string;
    version: string;
    description: string;
  };
  const out = new Map<string, string>();

  out.set(
    "skills/manifest.json",
    `${JSON.stringify(
      {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        homepage: "https://crackpay.vercel.app/developers",
        repository: "https://github.com/crackedstudio/crackpay-skills",
        install: {
          "claude-code": [
            "/plugin marketplace add crackedstudio/crackpay-skills",
            "/plugin install crackpay-skills@crackpay",
          ],
          "skills-cli": "npx skills add crackedstudio/crackpay-skills",
          "skills-cli-from-website": "npx skills add https://crackpay.vercel.app",
        },
        skills: skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          path: `${PLUGIN}/skills/${skill.name}/SKILL.md`,
          files: skill.files.map((file) => `${PLUGIN}/skills/${skill.name}/${file}`),
        })),
      },
      null,
      2,
    )}\n`,
  );

  const wellKnown = "apps/web/public/.well-known/agent-skills";
  out.set(`${wellKnown}/index.json`, `${JSON.stringify({ skills }, null, 2)}\n`);
  for (const skill of skills) {
    for (const file of skill.files) {
      out.set(`${wellKnown}/${skill.name}/${file}`, readFileSync(join(root, PLUGIN, "skills", skill.name, file), "utf8"));
    }
  }
  return out;
}
