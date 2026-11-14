// pack-the-bakery-kit: the two bakery skills packed as a Claude Code plugin in kit/, so a new
// person can install them. The layout is the one the plugins reference gives
// (https://code.claude.com/docs/en/plugins-reference.md): the manifest in .claude-plugin/,
// and the skills at the plugin's top level, not inside .claude-plugin/.
import { spawnSync } from "node:child_process";
import type { Rule } from "../scripts/verify";
import { bakeryRule, find, has, originalsUnchanged, text } from "./lib/bakery";

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

const HOOKS = "kit/hooks/hooks.json";
const HOOK_SCRIPT = "kit/hooks/block-till.sh";

// The PreToolUse hooks the kit names: a matcher and the command each one runs.
function preToolUseHooks(folder: string): { matcher?: string; hooks?: { command?: string }[] }[] {
  const hooks = JSON.parse(text(folder, HOOKS)).hooks?.PreToolUse;
  return Array.isArray(hooks) ? hooks : [];
}

function hookIsWired(folder: string): boolean {
  return preToolUseHooks(folder).some((entry) => {
    const matcher = String(entry.matcher ?? "");
    const commands = (entry.hooks ?? []).map((hook) => String(hook.command ?? ""));
    const runsTheScript = commands.some((command) => command.includes("block-till"));
    return matcher.includes("Write") && matcher.includes("Edit") && runsTheScript;
  });
}

// Run the hook the way Claude Code does: the tool call as JSON on its input.
function hookExitCode(folder: string, filePath: string): number | null {
  const script = find(folder, HOOK_SCRIPT);
  if (!script) return null;
  // biome-ignore lint/style/useNamingConvention: these are the names Claude Code sends.
  const toolCall = JSON.stringify({ tool_input: { file_path: filePath } });
  return spawnSync("bash", [script], { input: toolCall, encoding: "utf8" }).status;
}

const WORKFLOW = "kit/friday-close.workflow.yml";

// The lines of the workflow with no comments, so a hash line cannot fake a trigger.
const workflowLines = (folder: string) =>
  text(folder, WORKFLOW)
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"));

function runsOnATimerOrByHand(folder: string): boolean {
  const lines = workflowLines(folder);
  const hasOn = lines.some((line) => /^on:/.test(line));
  return hasOn && lines.some((line) => /^\s+(schedule|workflow_dispatch):/.test(line));
}

function runsClaude(folder: string): boolean {
  return workflowLines(folder).some(
    (line) => /\bclaude\s+-p\b/.test(line) || /anthropics\/claude-code-action/.test(line),
  );
}

function keyIsAPlaceholder(folder: string): boolean {
  const body = workflowLines(folder).join("\n");
  return /\$\{\{\s*secrets\.[A-Z_]+\s*\}\}/.test(body) && !/sk-ant-/.test(body);
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
    says: "kit/hooks/hooks.json adds a PreToolUse hook on Write and Edit that runs block-till",
    test: (folder) => has(folder, HOOKS) && hookIsWired(folder),
    tryNext:
      "ask Claude to add kit/hooks/hooks.json with a PreToolUse hook, matcher Write|Edit, " +
      "that runs block-till.sh",
  },
  {
    says: "the hook script stops an edit to till/sales.csv (exit code 2)",
    test: (folder) => hookExitCode(folder, "till/sales.csv") === 2,
    tryNext: "ask Claude to make block-till.sh print a reason and exit 2 when the path has till/",
  },
  {
    says: "the hook script lets an edit to out/notes.md through (exit code 0)",
    test: (folder) => hookExitCode(folder, "out/notes.md") === 0,
    tryNext: "ask Claude to make block-till.sh exit 0 for every path that is not in till/",
  },
  {
    says: `${WORKFLOW} runs on a schedule or by hand (on: schedule or workflow_dispatch)`,
    test: (folder) => has(folder, WORKFLOW) && runsOnATimerOrByHand(folder),
    tryNext: "save the workflow with an on: part that has schedule or workflow_dispatch",
  },
  {
    says: "the workflow has a step that runs claude",
    test: (folder) => has(folder, WORKFLOW) && runsClaude(folder),
    tryNext: 'ask Claude to add a step that runs claude -p "run the Friday close"',
  },
  {
    says: "the workflow takes its key from a secrets placeholder, never a real key",
    test: (folder) => has(folder, WORKFLOW) && keyIsAPlaceholder(folder),
    tryNext: "read the key from secrets.ANTHROPIC_API_KEY and never paste a real key into the file",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
