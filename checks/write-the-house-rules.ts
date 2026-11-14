// write-the-house-rules: CLAUDE.md at the top of the bakery folder holds the house rules.
// Claude reads it at the start of every chat, so it must be short enough to read in full.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text, workFolder } from "./lib/bakery";
import { fold, section, words } from "./lib/md";

const FILE = "CLAUDE.md";
// Claude Code also reads the project rules from .claude/CLAUDE.md, so either place counts.
const OTHER_PLACE = ".claude/CLAUDE.md";
const HEADINGS = [
  "About the bakery",
  "Where things live",
  "Never do",
  "Money rules",
  "How to write",
];
const LONGEST = 200;

const whereTheRulesAre = (folder: string) => (has(folder, FILE) ? FILE : OTHER_PLACE);
const rules = (folder: string) => text(folder, whereTheRulesAre(folder));
const neverDo = (folder: string) => fold(section(rules(folder), "never do") ?? "");
const lineCount = (folder: string) => rules(folder).trimEnd().split("\n").length;

// The note from running /init: what matched your own rules, and what did not.
const INIT_NOTE = "out/init-compare.md";
const RULES_FOLDER = ".claude/rules";
const FEW_WORDS = 3;
const RULE_WORDS = 8;

// The words after a label like "Same:" on the same line, or "" when the label is missing.
function afterLabel(note: string, label: string): string {
  const starts = (each: string) => fold(each).replace(/^[-*\s]+/, "").startsWith(label);
  const line = note.split("\n").find(starts);
  return line ? line.slice(line.indexOf(":") + 1) : "";
}

function initNoteIsReal(folder: string): boolean {
  if (!has(folder, INIT_NOTE)) return false;
  const note = text(folder, INIT_NOTE);
  const labelled = ["same:", "different:"].every(
    (label) => words(afterLabel(note, label)).length >= FEW_WORDS,
  );
  return labelled && fold(note).includes("/init");
}

// Each rule file under .claude/rules/, as its text.
function ruleFiles(folder: string): string[] {
  const rulesFolder = join(workFolder(folder), RULES_FOLDER);
  if (!existsSync(rulesFolder)) return [];
  return readdirSync(rulesFolder)
    .filter((name) => name.endsWith(".md"))
    .map((name) => text(folder, `${RULES_FOLDER}/${name}`));
}

// The lines inside the "---" fence at the top, or "" when the file has no fence.
const frontmatter = (file: string) => file.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
const bodyOf = (file: string) => file.replace(/^---\n[\s\S]*?\n---/, "");

function hasRealRule(file: string): boolean {
  return words(bodyOf(file).replace(/^#.*$/gm, "")).length >= RULE_WORDS;
}

// A rule is scoped by a paths list in its fence, or it is a topic with a heading of its own.
function hasScopeOrTopic(file: string): boolean {
  const scoped = /^paths:\s*(\S|\n\s*-\s*\S)/m.test(frontmatter(file));
  return scoped || /^#\s+\S/m.test(bodyOf(file));
}

// A folder counts as named when the text has its name, with or without the slash.
function namesFolder(written: string, folderName: string): boolean {
  const pattern = new RegExp(`(^|[^a-z-])${folderName}(/|[^a-z-]|$)`);
  return pattern.test(written);
}

function hasEveryHeading(folder: string): boolean {
  const written = rules(folder);
  return HEADINGS.every((heading) => section(written, heading.toLowerCase()) !== undefined);
}

export default [
  bakeryRule,
  {
    says: `${FILE} is at the top of the bakery folder`,
    test: (folder) => has(folder, FILE) || has(folder, OTHER_PLACE),
    tryNext: "ask Claude to save the house rules as CLAUDE.md next to orders/, not in out/",
  },
  {
    says: `it has the headings ${HEADINGS.join(", ")}`,
    test: hasEveryHeading,
    tryNext: "ask Claude to use these five headings, each on its own line starting with ##",
  },
  {
    says: "Never do says Claude must never delete a file",
    test: (folder) => neverDo(folder).includes("delete"),
    tryNext: 'ask Claude to add "Never delete a file." under the Never do heading',
  },
  {
    says: "Never do names till/ and purchase-orders/",
    test: (folder) => {
      const never = neverDo(folder);
      return namesFolder(never, "till") && namesFolder(never, "purchase-orders");
    },
    tryNext:
      'ask Claude to add "Never change anything in till/ or purchase-orders/." under Never do',
  },
  {
    says: "it says new files go in out/",
    test: (folder) => namesFolder(fold(rules(folder)), "out"),
    tryNext: 'ask Claude to add "Put every new file in out/." under Where things live',
  },
  {
    says: "it says to use /clear and start a new chat for each task",
    test: (folder) => {
      const written = fold(rules(folder));
      return written.includes("/clear") && written.includes("new chat");
    },
    tryNext:
      'ask Claude to add "One task per chat. Use /clear, or start a new chat, between tasks."',
  },
  {
    says: `it is shorter than ${LONGEST} lines`,
    test: (folder) => lineCount(folder) < LONGEST,
    tryNext: "ask Claude to cut the rules down to the ones that matter, under 50 lines is good",
  },
  {
    says: `${INIT_NOTE} names /init and has a Same: line and a Different: line`,
    test: initNoteIsReal,
    tryNext:
      "run /init, read what it suggests without saying yes, then write out/init-compare.md " +
      "with a line Same: and a line Different:",
  },
  {
    says: `${RULES_FOLDER}/ holds a rule file with a real rule in it`,
    test: (folder) => ruleFiles(folder).some(hasRealRule),
    tryNext: "ask Claude to write one rule file in .claude/rules/, such as money.md",
  },
  {
    says: "that rule file has a paths list or a heading for its topic",
    test: (folder) => ruleFiles(folder).some((file) => hasRealRule(file) && hasScopeOrTopic(file)),
    tryNext:
      "ask Claude to add a paths list at the top of the rule file, or a heading for the topic",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
