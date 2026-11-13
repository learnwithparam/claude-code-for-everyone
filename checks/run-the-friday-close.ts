// run-the-friday-close: the learner runs their whole close once on orders, bills and till sales
// they have never seen (wren-street-next-close/). Then every earlier check of the close must pass
// again on that folder, judged against the next close's own answer key.
//
// How: the check builds a short-lived copy of the course whose world/key.json and seed are the
// next close's. A bakery is made from that seed with the learner's files on top. Then the real
// earlier checks run on it, unchanged, in their own process.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NEXT_CLOSE, nextCloseFiles } from "../parts/06-share-the-close/next-close";
import type { Rule } from "../scripts/verify";
import { writeSeed } from "../world/build";
import { BAKERY, bakeryRule, ROOT, workFolder } from "./lib/bakery";

// The steps the Friday close does. A step whose check is not in the course yet gets no rule.
const PLANNED_CLOSE_STEPS = [
  "read-the-folder",
  "clean-the-orders",
  "fix-the-price-list",
  "reconcile-the-invoices",
  "build-the-label-skill",
  "write-the-monday-report",
  "publish-the-menu-page",
];
const CLOSE_STEPS = PLANNED_CLOSE_STEPS.filter((step) =>
  existsSync(join(ROOT, "checks", `${step}.ts`)),
);
const CLOSE_SKILL = ".claude/skills/friday-close/SKILL.md";
const NOT_COPIED = new Set([".git", "node_modules"]);

// The folder that holds the next close: the learner's second bakery, or a sample folder in CI.
function nextCloseFolder(folder: string): string {
  const work = workFolder(folder);
  return work === BAKERY ? NEXT_CLOSE : work;
}

// A copy of the course with the next close's answer key, and a bakery made from its seed.
function courseForNextClose(learnerFolder: string): { course: string; bakery: string } {
  const course = mkdtempSync(join(tmpdir(), "wren-next-close-"));
  for (const folder of ["checks", "scripts", "config"]) {
    cpSync(join(ROOT, folder), join(course, folder), { recursive: true });
  }
  symlinkSync(join(ROOT, "node_modules"), join(course, "node_modules"));
  const runner = join(ROOT, "parts", "06-share-the-close", "rerun.ts");
  cpSync(runner, join(course, "rerun.ts"));
  const { files, key } = nextCloseFiles();
  mkdirSync(join(course, "world"), { recursive: true });
  writeFileSync(join(course, "world", "key.json"), `${JSON.stringify(key, null, 2)}\n`);
  writeSeed(join(course, "world", "seed", "wren-street"), files);
  const bakery = join(course, "wren-street");
  writeSeed(bakery, files);
  const copyFilter = (path: string) => !NOT_COPIED.has(path.split(/[\\/]/).at(-1) ?? "");
  cpSync(learnerFolder, bakery, { recursive: true, filter: copyFilter });
  return { course, bakery };
}

// The rules each close step fails on the next close, worked out once for each folder.
const resultsByFolder = new Map<string, Record<string, string[]>>();

function closeResults(folder: string): Record<string, string[]> {
  const learnerFolder = nextCloseFolder(folder);
  const saved = resultsByFolder.get(learnerFolder);
  if (saved) return saved;
  const { course, bakery } = courseForNextClose(learnerFolder);
  const run = spawnSync("bun", [join(course, "rerun.ts"), ...CLOSE_STEPS], {
    cwd: course,
    encoding: "utf8",
    // biome-ignore lint/style/useNamingConvention: environment variable names are in capitals.
    env: { ...process.env, WREN_STREET: bakery },
  });
  rmSync(course, { recursive: true, force: true });
  const lastLine = run.stdout.trim().split("\n").at(-1);
  const results = JSON.parse(lastLine || "{}");
  resultsByFolder.set(learnerFolder, results);
  return results;
}

// One rule for each step of the close: its check passes again on the next close.
function passesAgain(step: string): Rule {
  return {
    says: `${step} passes again on the next close`,
    test: (folder) => closeResults(folder)[step]?.length === 0,
    tryNext: `read the ${step} page for what its file needs, fix the skill, and run it again`,
  };
}

export default [
  bakeryRule,
  {
    says: "the next close folder wren-street-next-close/ is there",
    test: (folder) => existsSync(nextCloseFolder(folder)),
    tryNext: "run bun parts/06-share-the-close/next-close.ts in the course folder",
  },
  {
    says: `the close is one skill: ${CLOSE_SKILL}, with name: friday-close`,
    test: (folder) => {
      const skill = join(nextCloseFolder(folder), CLOSE_SKILL);
      return existsSync(skill) && /^name:\s*friday-close\s*$/m.test(readFileSync(skill, "utf8"));
    },
    tryNext: "make the friday-close skill in wren-street, then run next-close.ts reset to copy it",
  },
  ...CLOSE_STEPS.map(passesAgain),
] satisfies Rule[];
