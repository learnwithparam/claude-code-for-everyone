// run-your-own-close: the capstone step. The learner runs the close on a copy of their own folder,
// my-close/, and keeps a run log. The rules are the capstone's: capstone/check.ts holds them, and
// this step adds one more, that the copy is not made of the practice bakery's files.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { rules as capstoneRules } from "../capstone/check";
import type { Rule } from "../scripts/verify";
import { bakeryRule, SEED, seedFiles, workFolder } from "./lib/bakery";

const mine = (folder: string) => join(workFolder(folder), "my-close");

function filesUnder(folder: string, base = folder): string[] {
  if (!existsSync(folder)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path, base));
    else found.push(path.slice(base.length + 1).replaceAll("\\", "/"));
  }
  return found;
}

const fingerprint = (path: string) =>
  createHash("sha256")
    .update(new Uint8Array(readFileSync(path)))
    .digest("hex");

const notTheBakery: Rule = {
  says: "my-close/input/ holds none of the bakery's own files",
  test: (folder) => {
    const bakery = new Set(seedFiles().map((file) => fingerprint(join(SEED, file))));
    const input = join(mine(folder), "input");
    return filesUnder(input).every((file) => !bakery.has(fingerprint(join(input, file))));
  },
  tryNext: "copy your own made-up or cleaned files, not the bakery's, into my-close/input/",
};

export default [
  bakeryRule,
  notTheBakery,
  ...capstoneRules.map((rule) => ({
    says: `my-close/: ${rule.says}`,
    test: (folder: string) => rule.test(mine(folder)),
    tryNext: rule.tryNext,
  })),
] satisfies Rule[];
