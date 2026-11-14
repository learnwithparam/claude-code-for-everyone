// The capstone check. Run it on your own folder: bun capstone/check.ts my-close
// It reads only that folder. It proves the shape and that the evidence is there: the files the
// run log names are real, Claude made a result, and a scheduled task is named for the folder.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { type CapstoneRule, readArtefact, runCapstoneCheck } from "../checks/capstone";
import { bullets, fold, section, words } from "../checks/lib/md";

const LOG = "out/run-log.md";
const PRACTICE_NAME = /wren street/i;

function filesUnder(folder: string, base = folder): string[] {
  if (!existsSync(folder)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path, base));
    else found.push(path.slice(base.length + 1).replaceAll("\\", "/"));
  }
  return found.filter((file) => !file.endsWith(".gitkeep"));
}

const logPart = (folder: string, heading: string) =>
  section(readArtefact(folder, LOG), heading) ?? "";

const pathsIn = (part: string) =>
  bullets(part).map((line) =>
    line
      .replace(/`/g, "")
      .split(/\s+[-:]\s+|\s{2,}/)[0]
      .trim(),
  );

const madeFiles = (folder: string) =>
  filesUnder(join(folder, "out")).filter((file) => file !== "run-log.md");

const everyNamedFileIsThere = (named: string[], have: string[], prefix: string) =>
  named.length >= 1 && named.every((path) => have.includes(path.replace(prefix, "")));

const copyIsYours = (folder: string) =>
  filesUnder(join(folder, "input")).every(
    (file) => !PRACTICE_NAME.test(readFileSync(join(folder, "input", file), "utf8")),
  );

const hasScheduleLine = (part: string) => {
  const names = /\/schedule/.test(part);
  const when = /\bevery\b|(?:^|\s)[\d*/,-]+(?:\s+[\d*/,-]+){4}(?:\s|$)/m.test(part);
  return names && when;
};

export const rules: CapstoneRule[] = [
  {
    says: "input/ holds a copy of 2 or more of your own files, not the practice bakery's",
    test: (folder) => filesUnder(join(folder, "input")).length >= 2 && copyIsYours(folder),
    tryNext: "copy 2 or more made-up or cleaned files from your own work into input/",
  },
  {
    says: "CLAUDE.md has a Never part with a rule",
    test: (folder) => {
      const never = section(readArtefact(folder, "CLAUDE.md"), "never") ?? "";
      return bullets(never).length >= 1 && words(never).length >= 5;
    },
    tryNext: 'ask Claude to write CLAUDE.md with a "## Never" heading and one dash rule',
  },
  {
    says: "Claude made at least one file in out/ besides the run log",
    test: (folder) => madeFiles(folder).length >= 1,
    tryNext: "run your task here and have Claude save its work into out/",
  },
  {
    says: "the run log has the five headings",
    test: (folder) => {
      const written = readArtefact(folder, LOG);
      const headings = [
        "what i asked",
        "files i used",
        "what claude made",
        "how i checked",
        "when it runs by itself",
      ];
      return headings.every((heading) => section(written, heading) !== undefined);
    },
    tryNext: "ask Claude to write out/run-log.md with the five headings from the template",
  },
  {
    says: "every file under Files I used is in input/",
    test: (folder) =>
      everyNamedFileIsThere(
        pathsIn(logPart(folder, "files i used")),
        filesUnder(join(folder, "input")),
        /^input\//,
      ),
    tryNext: "list only files that are really in input/, one per dash line",
  },
  {
    says: "every file under What Claude made is in out/",
    test: (folder) =>
      everyNamedFileIsThere(
        pathsIn(logPart(folder, "what claude made")),
        madeFiles(folder),
        /^out\//,
      ),
    tryNext: "list only files that are really in out/, one per dash line",
  },
  {
    says: "How I checked says what you looked at and what you found",
    test: (folder) => words(fold(logPart(folder, "how i checked"))).length >= 12,
    tryNext: "write a few lines: which result you opened, what you compared, what you found",
  },
  {
    says: "When it runs by itself names a /schedule task and when it runs",
    test: (folder) => hasScheduleLine(logPart(folder, "when it runs by itself")),
    tryNext: "add a line with /schedule and when it runs, such as: /schedule every Monday at 7",
  },
];

if (import.meta.main) runCapstoneCheck(rules);
