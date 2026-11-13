// Run some steps' checks on one bakery folder and print, as JSON, the rules each one fails.
// run-the-friday-close copies this file into a short-lived copy of the course whose answer key is
// the next close's, so every check reads the next close's own answers.
//   WREN_STREET=<bakery> bun rerun.ts clean-the-orders write-the-monday-report
import { join } from "node:path";

type Rule = { says: string; test: (folder: string) => boolean | Promise<boolean> };

// A folder name that ends in /problem makes a check read the bakery in WREN_STREET.
const LEARNER_WORK = join(import.meta.dir, "learner", "problem");

async function failedRules(stepName: string): Promise<string[]> {
  const rules: Rule[] = (await import(join(import.meta.dir, "checks", `${stepName}.ts`))).default;
  const failed: string[] = [];
  for (const rule of rules) {
    let ok = false;
    try {
      ok = await rule.test(LEARNER_WORK);
    } catch {
      ok = false;
    }
    if (!ok) failed.push(rule.says);
  }
  return failed;
}

const results: Record<string, string[]> = {};
for (const stepName of process.argv.slice(2)) results[stepName] = await failedRules(stepName);
console.log(JSON.stringify(results));
