// bun run verify <step-name>           check your work on one step, then progress on every step
// bun run verify <step-name> solution  check the sample solution instead
// bun run verify part <part-name>      check every step in one part (a deliverable)
// bun run verify --report              write verify-report.json for cohort grading
// bun run verify --all                 CI: each check fails on its starter and wrong answers,
//                                      and passes on its solution
// Exit codes: 0 pass, 1 fail, 2 the check could not run.

import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { allSteps, findStep, parts, ROOT, type Step } from "./structure";

export type Rule = {
  says: string;
  test: (dir: string) => boolean | Promise<boolean>;
  tryNext: string;
};
type Result = {
  step: string;
  status: "pass" | "fail" | "error";
  passed: number;
  total: number;
  failed: string[];
};

async function rulesFor(step: Step): Promise<Rule[]> {
  return (await import(join(ROOT, "checks", `${step.name}.ts`))).default;
}

// A rule that throws counts as a fail, so one broken file never stops the other rules.
async function rulePasses(rule: Rule, folder: string): Promise<boolean> {
  try {
    return await rule.test(folder);
  } catch {
    return false;
  }
}

function printRule(rule: Rule, ok: boolean) {
  if (ok) console.log(`  PASS  ${rule.says}`);
  else console.log(`  FAIL  ${rule.says}\n        Try next: ${rule.tryNext}`);
}

// Run every rule of one step's check on one folder. With print, show each PASS and FAIL line.
async function run(step: Step, folder: string, print = false): Promise<Result> {
  let rules: Rule[];
  try {
    rules = await rulesFor(step);
  } catch (error) {
    const reason = (error as Error).message;
    if (print) console.log(`  ERROR  the check for ${step.name} could not load: ${reason}`);
    return { step: step.name, status: "error", passed: 0, total: 0, failed: [] };
  }
  const failed: string[] = [];
  for (const rule of rules) {
    const ok = await rulePasses(rule, folder);
    if (!ok) failed.push(rule.says);
    if (print) printRule(rule, ok);
  }
  return {
    step: step.name,
    status: failed.length ? "fail" : "pass",
    passed: rules.length - failed.length,
    total: rules.length,
    failed,
  };
}

const starterFolder = (step: Step) => join(step.dir, "problem");

function wrongAnswers(step: Step) {
  const wrongFolder = join(step.dir, "wrong");
  if (!existsSync(wrongFolder)) return [];
  return readdirSync(wrongFolder).map((name) => ({ name, dir: join(wrongFolder, name) }));
}

const countPassing = (results: Result[]) =>
  results.filter((result) => result.status === "pass").length;

// Everything wrong with one step's check: a rule without advice, or a check that
// passes the starter, fails the solution, or lets a wrong answer through.
async function checkProblems(step: Step): Promise<string[]> {
  let rules: Rule[] = [];
  try {
    rules = await rulesFor(step);
  } catch (error) {
    return [`${step.name}: the check could not load: ${(error as Error).message}`];
  }
  const problems: string[] = [];
  for (const rule of rules) {
    const adviceWords = rule.tryNext.trim().split(/\s+/);
    if (adviceWords.length < 3)
      problems.push(`${step.name}: rule "${rule.says}" needs a try-next sentence`);
  }
  if ((await run(step, starterFolder(step))).status === "pass") {
    problems.push(`${step.name}: the check passes on the starter, so it checks nothing`);
  }
  problems.push(...(await solutionProblems(step)));
  const wrong = wrongAnswers(step);
  if (wrong.length === 0) {
    problems.push(
      `${step.name}: needs at least one wrong/<mistake>/ answer that the check must reject`,
    );
  }
  for (const answer of wrong) {
    if ((await run(step, answer.dir)).status === "pass") {
      problems.push(`${step.name}: wrong answer "${answer.name}" passes the check`);
    }
  }
  return problems;
}

async function solutionProblems(step: Step): Promise<string[]> {
  if (!existsSync(join(step.dir, "solution"))) {
    return [`${step.name}: needs solution/ so CI can prove the check can pass`];
  }
  const solution = await run(step, join(step.dir, "solution"));
  if (solution.status === "pass") return [];
  return [`${step.name}: the sample solution fails: ${solution.failed.join("; ")}`];
}

async function checkEveryCheck() {
  const problems: string[] = [];
  for (const step of allSteps()) problems.push(...(await checkProblems(step)));
  for (const problem of problems) console.log(`  ${problem}`);
  if (problems.length) console.log(`${problems.length} check problem(s).`);
  else console.log("Every check rejects its starter and wrong answers, and passes its solution.");
  process.exit(problems.length ? 1 : 0);
}

async function writeReport() {
  const results: Result[] = [];
  for (const step of allSteps()) results.push(await run(step, starterFolder(step)));
  const report = { version: 1, at: new Date().toISOString(), results };
  writeFileSync(join(ROOT, "verify-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const passing = countPassing(results);
  console.log(`Wrote verify-report.json: ${passing} of ${results.length} steps pass.`);
  process.exit(0);
}

function exitCodeForPart(results: Result[]): number {
  if (results.some((result) => result.status === "error")) return 2;
  if (countPassing(results) === results.length) return 0;
  return 1;
}

async function checkPart(partName: string | undefined) {
  const part = parts().find((candidate) => candidate.name === partName);
  if (!part) {
    console.log(partName ? `There is no part called "${partName}". Parts:` : "Name a part. Parts:");
    for (const known of parts()) console.log(`  bun run verify part ${known.name}`);
    process.exit(1);
  }
  console.log(`Part ${part.name}:`);
  const results: Result[] = [];
  for (const step of part.steps) {
    const result = await run(step, starterFolder(step));
    results.push(result);
    const status = result.status.toUpperCase().padEnd(5);
    console.log(`  ${status}  ${step.name}  (${result.passed}/${result.total} rules)`);
  }
  const done = countPassing(results);
  if (done === results.length) {
    console.log(`Part ${part.name} is done: ${done}/${results.length} steps pass.`);
  } else {
    const hint = "Run bun run verify <step-name> on a FAIL line to see why.";
    console.log(`${done}/${results.length} steps pass. ${hint}`);
  }
  process.exit(exitCodeForPart(results));
}

function stepOrList(stepName: string | undefined): Step {
  const step = stepName ? findStep(stepName) : undefined;
  if (step) return step;
  console.log(stepName ? `There is no step called "${stepName}". Steps:` : "Name a step. Steps:");
  for (const known of allSteps()) console.log(`  bun run verify ${known.name}`);
  process.exit(1);
}

async function checkStep(stepName: string | undefined, which: string | undefined) {
  const step = stepOrList(stepName);
  const asSolution = which === "solution";
  const whose = asSolution ? "sample solution" : "your work";
  console.log(`Checking ${step.name} (${whose}):`);
  const folder = asSolution ? join(step.dir, "solution") : starterFolder(step);
  const result = await run(step, folder, true);
  if (result.status === "error") process.exit(2);
  if (result.status === "pass") console.log(`Done. All ${result.total} rules pass.`);
  else {
    const passedOf = `${result.passed} of ${result.total} rules pass.`;
    console.log(`${passedOf} Fix the FAIL lines and run it again.`);
  }
  if (!asSolution) await showProgress();
  process.exit(result.status === "pass" ? 0 : 1);
}

// Done is recomputed from the checks every time, never read from a saved flag.
async function showProgress() {
  const results: Result[] = [];
  for (const step of allSteps()) results.push(await run(step, starterFolder(step)));
  console.log(`Progress: ${countPassing(results)}/${results.length} steps pass.`);
}

const [command, which] = process.argv.slice(2);

if (command === "--all") await checkEveryCheck();
if (command === "--report") await writeReport();
if (command === "part") await checkPart(which);
await checkStep(command, which);
