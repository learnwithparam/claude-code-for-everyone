// find-the-unmatched-invoices: the learner's saved DuckDB query lists the bills with a fault.
// The assignment check does the work, so the step and the take-home assignment never disagree.
import { join, sep } from "node:path";
import { COUNT_LINE, DUCKDB_VERSION, judge, RUNS_LINE } from "../assignment/check";
import type { Rule } from "../scripts/verify";
import { ROOT } from "./lib/bakery";

// A learner's own run reads assignment/starter. A sample folder (solution or wrong) reads itself.
function queryFolder(folder: string): string {
  const learnerRun = folder.endsWith(`${sep}problem`) && !process.argv.includes("--all");
  return learnerRun ? join(ROOT, "assignment", "starter") : folder;
}

function passes(line: string) {
  return (folder: string) => {
    const { verdicts } = judge(queryFolder(folder));
    return verdicts.some((verdict) => verdict.line === line && verdict.result === "pass");
  };
}

export default [
  {
    says: RUNS_LINE,
    test: passes(RUNS_LINE),
    tryNext: `ask Claude to save unmatched.sql and run it with DuckDB ${DUCKDB_VERSION}`,
  },
  {
    says: COUNT_LINE,
    test: passes(COUNT_LINE),
    tryNext:
      "ask Claude what matched means: first bill for the order, agreed price, quantity ordered",
  },
] satisfies Rule[];
