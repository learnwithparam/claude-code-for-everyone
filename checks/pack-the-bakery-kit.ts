// pack-the-bakery-kit: the two bakery skills packed as a Claude Code plugin in kit/, so a new
// person can install them. The layout is the one the plugins reference gives
// (https://code.claude.com/docs/en/plugins-reference.md): the manifest in .claude-plugin/,
// and the skills at the plugin's top level, not inside .claude-plugin/.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";

const MANIFEST = "kit/.claude-plugin/plugin.json";
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

const manifest = (folder: string) => JSON.parse(text(folder, MANIFEST));

const skillPath = (skill: string) => `kit/skills/${skill}/SKILL.md`;

// The name and description lines between the --- lines at the top of a skill.
function skillFront(folder: string, skill: string): string {
  return text(folder, skillPath(skill)).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

function skillIsReady(folder: string, skill: string): boolean {
  const front = skillFront(folder, skill);
  const named = new RegExp(`^name:\\s*${skill}\\s*$`, "m").test(front);
  return named && /^description:\s*\S/m.test(front);
}

export default [
  bakeryRule,
  {
    says: `${MANIFEST} is there and is valid`,
    test: (folder) => typeof manifest(folder) === "object",
    tryNext: "ask Claude to put plugin.json inside kit/.claude-plugin/, with no extra commas",
  },
  {
    says: "it has a name in kebab-case, like wren-street-kit",
    test: (folder) => KEBAB_CASE.test(String(manifest(folder).name)),
    tryNext: "ask Claude for a name of small words joined by dashes, with no spaces",
  },
  {
    says: "it has a version like 1.0.0 and a description",
    test: (folder) => {
      const { version, description } = manifest(folder);
      return VERSION.test(String(version)) && String(description ?? "").trim().length > 0;
    },
    tryNext: 'ask Claude to add "version": "1.0.0" and a one line "description"',
  },
  {
    says: "kit/skills/allergen-label/SKILL.md has its name and a description",
    test: (folder) => skillIsReady(folder, "allergen-label"),
    tryNext:
      "ask Claude to copy .claude/skills/allergen-label into kit/skills/, not into .claude-plugin/",
  },
  {
    says: "kit/skills/monday-report/SKILL.md has its name and a description",
    test: (folder) => skillIsReady(folder, "monday-report"),
    tryNext:
      "ask Claude to copy .claude/skills/monday-report into kit/skills/, not into .claude-plugin/",
  },
  {
    says: "the skills sit next to .claude-plugin/, not inside it",
    test: (folder) => !has(folder, "kit/.claude-plugin/skills/allergen-label/SKILL.md"),
    tryNext: "ask Claude to move kit/.claude-plugin/skills up one level, to kit/skills",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
