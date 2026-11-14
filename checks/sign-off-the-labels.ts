// sign-off-the-labels: a person read each label and signed it, and ticked the done list.
// Claude never signs a label on its own.
import type { Rule } from "../scripts/verify";
import { fieldOf } from "./build-the-label-skill";
import { bakeryRule, has, KEY, originalsUnchanged, text } from "./lib/bakery";
import { bullets, fold, section } from "./lib/md";
import { checkboxLines } from "./write-the-done-list";

const LABELS = "out/labels";
const SLUGS = Object.keys(KEY.labels);

const signer = (folder: string, slug: string) =>
  fieldOf(text(folder, `${LABELS}/${slug}.md`), "checked by") ?? "";

const SETTINGS = ".claude/settings.json";
const REVIEW = "out/review.md";

// Every command in a Stop hook, from .claude/settings.json. Empty when there is none.
function stopCommands(folder: string): string[] {
  if (!has(folder, SETTINGS)) return [];
  const groups: unknown = JSON.parse(text(folder, SETTINGS)).hooks?.Stop;
  if (!Array.isArray(groups)) return [];
  const hooks = groups.flatMap((group) => (Array.isArray(group?.hooks) ? group.hooks : []));
  return hooks
    .filter((hook) => hook?.type === "command" && typeof hook.command === "string")
    .map((hook) => hook.command.trim())
    .filter(Boolean);
}

// The script file a Stop hook command runs: the first word that names a file in the folder.
function hookScript(folder: string): string {
  const words = stopCommands(folder).flatMap((command) => command.split(/\s+/));
  const names = words.map((word) => word.replace(/^["']|["']$/g, "").replace(/^\$\{?CLAUDE_PROJECT_DIR\}?"?\//, ""));
  const found = names.find((name) => has(folder, name) && /\.(sh|ts|js|py)$/.test(name));
  return found === undefined ? "" : text(folder, found);
}

const reviewLines = (folder: string) => (has(folder, REVIEW) ? text(folder, REVIEW) : "");
const foundItems = (folder: string) => bullets(section(reviewLines(folder), "found") ?? "");

const isTicked = (line: string) => /\[[xX]\]/.test(line);

export default [
  bakeryRule,
  {
    says: `there is a label for each of the ${SLUGS.length} recipes in ${LABELS}/`,
    test: (folder) => SLUGS.every((slug) => has(folder, `${LABELS}/${slug}.md`)),
    tryNext: "finish build-the-label-skill first, then come back",
  },
  {
    says: 'every label has a name after "Checked by:"',
    test: (folder) => SLUGS.every((slug) => signer(folder, slug) !== ""),
    tryNext: "read each label, then tell Claude your name for the Checked by line",
  },
  {
    says: "no label is signed by Claude",
    test: (folder) => SLUGS.every((slug) => !fold(signer(folder, slug)).includes("claude")),
    tryNext: "a person signs; tell Claude to put your name, not its own, on the Checked by line",
  },
  {
    says: "every item in out/labels-done.md is ticked",
    test: (folder) => {
      const lines = checkboxLines(folder);
      return lines.length > 0 && lines.every(isTicked);
    },
    tryNext: "check each item on the done list, then ask Claude to tick it: [x]",
  },
  {
    says: `${SETTINGS} has a Stop hook that runs a command`,
    test: (folder) => stopCommands(folder).length > 0,
    tryNext: 'ask Claude to add a "Stop" hook to .claude/settings.json that runs your check script',
  },
  {
    says: "the Stop hook runs a script in your folder that can block with exit 2",
    test: (folder) => /exit\s+2\b|process\.exit\(2\)/.test(hookScript(folder)),
    tryNext: "ask Claude to make the script print what is wrong and exit with 2, so Claude cannot stop",
  },
  {
    says: `${REVIEW} says /code-review was run in a subagent`,
    test: (folder) => {
      const note = fold(reviewLines(folder));
      return note.includes("/code-review") && note.includes("subagent");
    },
    tryNext: "ask Claude to run /code-review in a subagent on out/labels/, then save a note",
  },
  {
    says: `${REVIEW} has a "Found" part with 1 or more bullets`,
    test: (folder) => foundItems(folder).length >= 1,
    tryNext: 'ask Claude to list what the review found under "## Found", one dash per finding',
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "sign the labels in out/labels/, not the old ones in labels/",
  },
] satisfies Rule[];
