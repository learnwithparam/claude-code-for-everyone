// write-the-done-list: out/labels-done.md says what a finished label needs, and it was saved
// in a save point before any label existed.
//
// File times cannot show the order: Claude Code saves a file by writing a new copy, so ticking a
// box later gives the done list a new time. The save points can. In your bakery folder the check
// asks git for the first save point that holds the done list. A sample folder in the course has
// no real save points, so it holds what git printed when the sample was made:
//   .save-point/done-list-save.txt  the files in the first save point that holds the done list
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { BAKERY, bakeryRule, has, originalsUnchanged, text, workFolder } from "./lib/bakery";
import { fold } from "./lib/md";

const FILE = "out/labels-done.md";
const RECORD = ".save-point/done-list-save.txt";
const SMALLEST = 4;
const CHECKBOX = /^\s*[-*]\s+\[[ xX]\]\s+\S/;

const isYourBakery = (folder: string) => workFolder(folder) === BAKERY;
const asLines = (printed: string) =>
  printed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

// What one git command prints in the bakery folder. It throws when git is missing or fails.
function askGit(folder: string, gitArguments: string[]): string {
  const result = spawnSync("git", gitArguments, { cwd: workFolder(folder), encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${gitArguments[0]} did not work`);
  return result.stdout;
}

// The files in the first save point that holds the done list. Empty when no save point has it.
function filesInFirstSaveWithDoneList(folder: string): string[] {
  if (!isYourBakery(folder)) return has(folder, RECORD) ? asLines(text(folder, RECORD)) : [];
  if (!existsSync(join(workFolder(folder), ".git"))) return [];
  const saves = asLines(askGit(folder, ["log", "--reverse", "--format=%H", "--", FILE]));
  if (saves.length === 0) return [];
  return asLines(askGit(folder, ["ls-tree", "-r", "--name-only", saves[0]]));
}

function savedBeforeTheLabels(folder: string): boolean {
  const files = filesInFirstSaveWithDoneList(folder);
  const holdsTheDoneList = files.includes(FILE);
  const holdsAnyLabel = files.some((file) => file.startsWith("out/labels/"));
  return holdsTheDoneList && !holdsAnyLabel;
}

export const checkboxLines = (folder: string) =>
  text(folder, FILE)
    .split("\n")
    .filter((line) => CHECKBOX.test(line));

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (folder) => has(folder, FILE),
    tryNext: "ask Claude to write what a finished label needs in out/labels-done.md",
  },
  {
    says: `it has ${SMALLEST} or more checkbox lines`,
    test: (folder) => checkboxLines(folder).length >= SMALLEST,
    tryNext: 'ask Claude to write each check as a line that starts with "- [ ]"',
  },
  {
    says: "one check names sesame",
    test: (folder) => checkboxLines(folder).some((line) => fold(line).includes("sesame")),
    tryNext: "ask Claude to add a check: the label names sesame when the recipe has sesame",
  },
  {
    says: "one check names the sign-off by a person",
    test: (folder) => checkboxLines(folder).some((line) => /checked by|sign/.test(fold(line))),
    tryNext: 'ask Claude to add a check: a person has filled in the "Checked by:" line',
  },
  {
    says: "the done list was in a save point before any label was made",
    test: savedBeforeTheLabels,
    tryNext:
      "ask Claude to make a save point called done-list; if labels exist, first ask it to " +
      "move out/labels/ to out/labels-early/",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
