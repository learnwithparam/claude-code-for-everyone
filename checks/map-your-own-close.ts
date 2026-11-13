// map-your-own-close: the learner maps the bakery close onto the task they wrote in
// out/why-i-am-here.md. The map names that task, the files it needs, the first rule for its
// CLAUDE.md, and one check a script could run.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { bullets, fold, section, words } from "./lib/md";

const MAP = "out/friday-close.md";
const WHY = "out/why-i-am-here.md";
// Files that belong to the bakery. A map of your own job names your own files instead.
const BAKERY_FILES = [
  "wholesale-orders.csv",
  "sales.csv",
  "purchase-orders.csv",
  "price-list.xlsx",
  "owner-notes.md",
];
// Small words that say nothing about the task itself.
const COMMON_WORDS = new Set(["want", "claude", "that", "this", "with", "from", "them", "they"]);

// The words of four letters or more that say what the task is, from out/why-i-am-here.md.
function taskWords(folder: string): string[] {
  const sentence = fold(text(folder, WHY).replace(/^#.*$/gm, ""));
  const all = sentence.match(/[a-z]{4,}/g) ?? [];
  return [...new Set(all)].filter((word) => !COMMON_WORDS.has(word));
}

const part = (folder: string, heading: string) => section(text(folder, MAP), heading) ?? "";

function namesMyTask(folder: string): boolean {
  const myTask = fold(part(folder, "my task"));
  const shared = taskWords(folder).filter((word) => myTask.includes(word));
  return shared.length >= 3;
}

export default [
  bakeryRule,
  {
    says: `${MAP} is there`,
    test: (folder) => has(folder, MAP),
    tryNext: "ask Claude to make out/friday-close.md with the four headings from the step page",
  },
  {
    says: `"## My task" is the task from ${WHY}`,
    test: namesMyTask,
    tryNext: "ask Claude to copy your sentence from out/why-i-am-here.md under ## My task",
  },
  {
    says: '"## Files it needs" lists 2 or more of your own files, not the bakery\'s',
    test: (folder) => {
      const files = bullets(part(folder, "files it needs"));
      const bakeryFile = files.some((file) => BAKERY_FILES.some((name) => file.includes(name)));
      return files.length >= 2 && !bakeryFile;
    },
    tryNext: "ask Claude to list the files your own task reads, each on a line with a dash",
  },
  {
    says: '"## First rule for its CLAUDE.md" has a rule',
    test: (folder) => words(part(folder, "first rule")).length >= 4,
    tryNext: "ask Claude to write the one rule Claude must never break at your job",
  },
  {
    says: '"## One check a script could run" says what it would check',
    test: (folder) => words(part(folder, "one check")).length >= 6,
    tryNext: "ask Claude for one yes or no test on a file, like the checks in this course",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
