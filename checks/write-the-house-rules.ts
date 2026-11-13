// write-the-house-rules: CLAUDE.md at the top of the bakery folder holds the house rules.
// Claude reads it at the start of every chat, so it must be short enough to read in full.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { fold, section } from "./lib/md";

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
    says: `it is shorter than ${LONGEST} lines`,
    test: (folder) => lineCount(folder) < LONGEST,
    tryNext: "ask Claude to cut the rules down to the ones that matter, under 50 lines is good",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
