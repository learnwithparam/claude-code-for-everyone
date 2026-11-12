// Every page a learner reads stays at grade 6 or lower, and no learner file names a time, a weekday or a date.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { grade } from "./readability";

const ROOT = join(import.meta.dir, "..");
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (
      ["node_modules", ".git", "wren-street", "finished", "solution", "wrong", "seed"].includes(
        e,
      ) ||
      e.startsWith("wren-street-backup")
    )
      continue;
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const pages = [
  join(ROOT, "README.md"),
  ...walk(join(ROOT, "00-orientation")),
  ...walk(join(ROOT, "parts")),
].filter((f) => f.endsWith(".md"));

for (const f of pages) {
  const rel = relative(ROOT, f);
  const text = readFileSync(f, "utf8");
  test(`${rel} reads at grade 6 or lower`, () => {
    const g = grade(text);
    expect(g.grade).toBeLessThanOrEqual(6);
  });
  test(`${rel} names no weekday as a time, no date and no hour or day count`, () => {
    // Business words stay: the Friday close, the Monday report.
    const lines = text.split("\n").filter((l) => !l.startsWith("```"));
    for (const l of lines) {
      const clean = l.replace(/\b(Friday close|Monday report|monday-report|friday-close)\b/gi, "");
      expect(clean).not.toMatch(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/);
      expect(clean).not.toMatch(
        /\b(day|week|hour|month)\s+\d+\b|\b\d+\s+(hours?|days?|weeks?|months?)\b/i,
      );
      expect(clean).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
    }
  });
}

test("troubleshooting.md lists every FAIL line a check can print", async () => {
  const { allSteps } = await import("../scripts/structure");
  const trouble = readFileSync(join(ROOT, "00-orientation", "troubleshooting.md"), "utf8");
  for (const s of allSteps()) {
    const rules = (await import(join(ROOT, "checks", `${s.name}.ts`))).default as {
      says: string;
    }[];
    for (const r of rules) expect(trouble).toContain(`FAIL  ${r.says}`);
  }
});
