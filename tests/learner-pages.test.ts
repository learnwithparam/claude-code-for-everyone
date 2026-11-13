// Every page a learner reads stays at grade 6 or lower,
// and no learner file names a time, a weekday or a date.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { grade } from "./readability";

const ROOT = join(import.meta.dir, "..");

// Folders that are not learner pages: tools, the bakery itself, and sample answers.
const SKIPPED = ["node_modules", ".git", "wren-street", "finished", "solution", "wrong", "seed"];
const isSkipped = (entry: string) =>
  SKIPPED.includes(entry) || entry.startsWith("wren-street-backup");

function walk(folder: string, found: string[] = []): string[] {
  for (const entry of readdirSync(folder)) {
    if (isSkipped(entry)) continue;
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else found.push(path);
  }
  return found;
}

const pages = [
  join(ROOT, "README.md"),
  ...walk(join(ROOT, "00-orientation")),
  ...walk(join(ROOT, "parts")),
].filter((file) => file.endsWith(".md"));

// Business words stay: the Friday close, the Monday report.
const BUSINESS_WORDS = /\b(Friday close|Monday report|monday-report|friday-close)\b/gi;
const WEEKDAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/;
const TIME_COUNT = /\b(day|week|hour|month)\s+\d+\b|\b\d+\s+(hours?|days?|weeks?|months?)\b/i;
const DATE = /\b20\d\d-\d\d-\d\d\b/;

for (const file of pages) {
  const relativePath = relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  test(`${relativePath} reads at grade 6 or lower`, () => {
    expect(grade(text).grade).toBeLessThanOrEqual(6);
  });
  test(`${relativePath} names no weekday as a time, no date and no hour or day count`, () => {
    const lines = text.split("\n").filter((line) => !line.startsWith("```"));
    for (const line of lines) {
      const clean = line.replace(BUSINESS_WORDS, "");
      expect(clean).not.toMatch(WEEKDAY);
      expect(clean).not.toMatch(TIME_COUNT);
      expect(clean).not.toMatch(DATE);
    }
  });
}

test("troubleshooting.md lists every FAIL line a check can print", async () => {
  const { allSteps } = await import("../scripts/structure");
  const trouble = readFileSync(join(ROOT, "00-orientation", "troubleshooting.md"), "utf8");
  for (const step of allSteps()) {
    const checkFile = join(ROOT, "checks", `${step.name}.ts`);
    const rules = (await import(checkFile)).default as { says: string }[];
    for (const rule of rules) expect(trouble).toContain(`FAIL  ${rule.says}`);
  }
});
