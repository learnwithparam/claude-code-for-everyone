// run-your-own-close: the capstone. The learner runs the close on a copy of their own folder,
// in my-close/, and keeps a run log. The check reads only that folder, never the bakery's files.
// It proves the shape (rules, a log with its headings) and that evidence exists: the files
// the log names are really there, and Claude made at least one file in out/.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { bakeryRule, SEED, seedFiles, workFolder } from "./lib/bakery";
import { bullets, fold, section, words } from "./lib/md";

const MINE = "my-close";
const LOG = "out/run-log.md";
const RULES_FILE = "CLAUDE.md";

const mine = (folder: string, path = "") => join(workFolder(folder), MINE, path);

// Every file under a folder, with forward slashes, relative to that folder.
function filesUnder(folder: string, base = folder): string[] {
  if (!existsSync(folder)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path, base));
    else
      found.push(
        path
          .slice(base.length + 1)
          .split("\\")
          .join("/"),
      );
  }
  return found;
}

const fingerprint = (path: string) =>
  createHash("sha256")
    .update(new Uint8Array(readFileSync(path)))
    .digest("hex");

const readMine = (folder: string, path: string) => readFileSync(mine(folder, path), "utf8");

// The part of the run log under one heading.
const logPart = (folder: string, heading: string) => section(readMine(folder, LOG), heading) ?? "";

// The paths a log part names, one per dash line, without backticks.
const pathsIn = (written: string) =>
  bullets(written).map((line) =>
    line
      .replace(/`/g, "")
      .split(/\s+[-:]\s+|\s{2,}/)[0]
      .trim(),
  );

function inputFiles(folder: string): string[] {
  return filesUnder(mine(folder, "input"));
}

// A copy of your own work is not made of the bakery's files.
function copyIsNotTheBakery(folder: string): boolean {
  const bakery = new Set(seedFiles().map((file) => fingerprint(join(SEED, file))));
  return inputFiles(folder).every(
    (file) => !bakery.has(fingerprint(mine(folder, `input/${file}`))),
  );
}

const madeFiles = (folder: string) =>
  filesUnder(mine(folder, "out")).filter((f) => f !== "run-log.md");

export default [
  bakeryRule,
  {
    says: "my-close/input/ holds a copy of 2 or more of your own files, not the bakery's",
    test: (folder) => inputFiles(folder).length >= 2 && copyIsNotTheBakery(folder),
    tryNext: "copy 2 or more made-up or cleaned files from your own work into my-close/input/",
  },
  {
    says: "my-close/CLAUDE.md has a Never part with a rule",
    test: (folder) => {
      const never = section(readMine(folder, RULES_FILE), "never") ?? "";
      return bullets(never).length >= 1 && words(never).length >= 5;
    },
    tryNext: 'ask Claude to write my-close/CLAUDE.md with a "## Never" heading and one dash rule',
  },
  {
    says: "Claude made at least one file in my-close/out/ besides the run log",
    test: (folder) => madeFiles(folder).length >= 1,
    tryNext: "run your close in my-close/ and have Claude save its work into my-close/out/",
  },
  {
    says: 'the run log has "What I asked", "Files I used", "What Claude made" and "How I checked"',
    test: (folder) => {
      const written = readMine(folder, LOG);
      const headings = ["what i asked", "files i used", "what claude made", "how i checked"];
      return headings.every((heading) => section(written, heading) !== undefined);
    },
    tryNext: "ask Claude to write my-close/out/run-log.md with the four headings from the template",
  },
  {
    says: "every file under Files I used is in my-close/input/",
    test: (folder) => {
      const named = pathsIn(logPart(folder, "files i used"));
      const have = inputFiles(folder);
      return (
        named.length >= 1 && named.every((path) => have.includes(path.replace(/^input\//, "")))
      );
    },
    tryNext: "list only files that are really in my-close/input/, one per dash line",
  },
  {
    says: "every file under What Claude made is in my-close/out/",
    test: (folder) => {
      const named = pathsIn(logPart(folder, "what claude made"));
      const have = madeFiles(folder);
      return named.length >= 1 && named.every((path) => have.includes(path.replace(/^out\//, "")));
    },
    tryNext: "list only files that are really in my-close/out/, one per dash line",
  },
  {
    says: "How I checked says what you looked at and what you found, in a few words",
    test: (folder) => words(fold(logPart(folder, "how i checked"))).length >= 12,
    tryNext: "write a few lines: which result you opened, what you compared, what you found",
  },
] satisfies Rule[];
