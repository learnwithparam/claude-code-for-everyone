// ladder: every Claude Code feature on the L0 to L6 ladder maps to a step with a check.
//   bun checks/ladder.ts            fails when a mapped feature has no step or no proof,
//                                   and lists the features still planned
//   bun checks/ladder.ts --strict   also fails on every planned feature
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";

const ROOT = join(import.meta.dir, "..");
const STRICT = process.argv.includes("--strict");
// The features STANDARD v2, section 7, says each course must walk.
const REQUIRED = [
  "plan mode",
  "@ files",
  "screenshots",
  "a specific prompt",
  "permission modes",
  "diff review",
  "Esc",
  "/rewind",
  "/clear",
  "/init",
  "CLAUDE.md under 200 lines",
  ".claude/rules",
  "a check to run",
  "hooks",
  "deny rules",
  "sandbox",
  "skills",
  "MCP or CLI tools",
  "interview to SPEC.md",
  "/goal",
  "Stop hook gate",
  "/code-review in a subagent",
  "subagents",
  "worktrees",
  "/batch",
  "a reviewer agent",
  "claude -p",
  "/loop",
  "/schedule",
  "a GitHub Action",
  "a run contract and metrics",
];

type Feature = { level: string; name: string; step?: string; proof?: string; planned?: boolean };

async function rulesOf(step: string): Promise<Rule[] | undefined> {
  try {
    return (await import(join(ROOT, "checks", `${step}.ts`))).default;
  } catch {
    return undefined;
  }
}

// What a rule tells a learner, in lower case: what it says, and what to try next.
const ruleWords = (rule: Rule) => `${rule.says} ${rule.tryNext}`.toLowerCase();

async function problemWith(feature: Feature): Promise<string | undefined> {
  if (!feature.step) return `${feature.name}: no step`;
  const rules = await rulesOf(feature.step);
  if (!rules) return `${feature.name}: the step ${feature.step} has no check`;
  const proof = (feature.proof ?? "").toLowerCase();
  if (!proof || !rules.some((rule) => ruleWords(rule).includes(proof))) {
    return `${feature.name}: no rule in ${feature.step} says "${feature.proof}"`;
  }
  return undefined;
}

async function main() {
  const text = readFileSync(join(ROOT, "ladder.toml"), "utf8");
  const features = (Bun.TOML.parse(text) as { feature: Feature[] }).feature;
  const listed = new Set(features.map((feature) => feature.name));
  const problems = REQUIRED.filter((name) => !listed.has(name)).map(
    (name) => `${name}: not in ladder.toml`,
  );
  const planned = features.filter((feature) => feature.planned).map((feature) => feature.name);
  for (const feature of features.filter((candidate) => !candidate.planned)) {
    const problem = await problemWith(feature);
    if (problem) problems.push(problem);
  }
  if (STRICT) problems.push(...planned.map((name) => `${name}: planned, no step yet`));
  if (problems.length > 0) {
    console.log(`The ladder has ${problems.length} problem(s):`);
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exit(1);
  }
  const mapped = features.length - planned.length;
  console.log(`The ladder: ${mapped} features have a step and a check; ${planned.length} planned.`);
  if (planned.length > 0) console.log(`  Planned: ${planned.join(", ")}`);
}

main();
