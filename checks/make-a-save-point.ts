// make-a-save-point: the bakery folder has its own save point (a git commit) that holds every
// original file and the work in out/.
//
// In your bakery folder the check asks git itself. A sample folder in the course has no real
// save point, so it holds what git printed when the sample was made, in .save-point/:
//   log.txt    what `git log --format=%s` printed: one line for each save point
//   files.txt  what `git ls-files` printed: one line for each saved file
// The steps rewind-a-bad-edit and recover-a-deleted-file read save points the same way.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import {
  BAKERY,
  bakeryRule,
  has,
  originalsUnchanged,
  seedFiles,
  text,
  workFolder,
} from "./lib/bakery";

const RECORD = ".save-point";

const isYourBakery = (folder: string) => workFolder(folder) === BAKERY;

// What one git command prints in the bakery folder. It throws when git is missing or fails.
function askGit(folder: string, gitArguments: string[]): string {
  const result = spawnSync("git", gitArguments, { cwd: workFolder(folder), encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${gitArguments[0]} did not work`);
  return result.stdout;
}

const asLines = (printed: string) =>
  printed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

// The bakery has its own save points, not the course folder's around it.
export function hasSavePoints(folder: string): boolean {
  if (isYourBakery(folder)) return existsSync(join(workFolder(folder), ".git"));
  return has(folder, `${RECORD}/log.txt`);
}

// The name of each save point, newest first.
export function savePoints(folder: string): string[] {
  if (isYourBakery(folder)) return asLines(askGit(folder, ["log", "--format=%s"]));
  return asLines(text(folder, `${RECORD}/log.txt`));
}

// Every file the latest save point holds.
export function savedFiles(folder: string): string[] {
  if (isYourBakery(folder)) return asLines(askGit(folder, ["ls-files"]));
  return asLines(text(folder, `${RECORD}/files.txt`));
}

function everyOriginalSaved(folder: string): boolean {
  const saved = new Set(savedFiles(folder));
  return seedFiles().every((file) => saved.has(file));
}

export default [
  bakeryRule,
  {
    says: "the bakery folder has its own save points",
    test: hasSavePoints,
    tryNext: 'ask Claude: "Make this folder a git repository, so I can make save points"',
  },
  {
    says: "there is at least one save point",
    test: (folder) => savePoints(folder).length > 0,
    tryNext: 'ask Claude: "Make a save point of every file, called before-labels"',
  },
  {
    says: "every original bakery file is in the save point",
    test: everyOriginalSaved,
    tryNext: "ask Claude to add every file in the folder to the save point, then save again",
  },
  {
    says: "your work in out/ is in the save point too",
    test: (folder) => savedFiles(folder).some((file) => file.startsWith("out/")),
    tryNext: "ask Claude to take out/ out of .gitignore, then make a new save point",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
