// bun run assignment [folder]: checks the two Done-when lines and writes assignment/result.json.
// The folder holds the learner's unmatched.sql. The two CSV files are always read from starter/.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
const DATA_FOLDER = join(HERE, "starter");
const KEY = JSON.parse(readFileSync(join(HERE, "..", "world", "key.json"), "utf8"));
export const DUCKDB_VERSION = "2.0.0";

export const RUNS_LINE = `The saved query runs with DuckDB ${DUCKDB_VERSION}`;
export const COUNT_LINE = "The mismatch count matches the answer key";

type QueryRun = { duckdb: string; rows: string[][] } | undefined;
export type Verdict = { line: string; result: "pass" | "fail" };

// The bills the course planted a fault in: the copy, the three high prices and the short box.
export function answerKey(): string[] {
  const invoices = KEY.invoices;
  const faulty = [invoices.duplicatePair[1], ...invoices.priceAbovePo, ...invoices.shortDelivery];
  return faulty.sort();
}

export function runQuery(folder: string): QueryRun {
  const queryFile = join(folder, "unmatched.sql");
  if (!existsSync(queryFile)) return undefined;
  const command = ["uv", "run", "--no-project", "--with", `duckdb==${DUCKDB_VERSION}`];
  const script = [join(HERE, "run_query.py"), DATA_FOLDER, queryFile];
  const run = Bun.spawnSync([...command, "python", "-I", ...script], { stderr: "pipe" });
  if (run.exitCode !== 0) return undefined;
  return JSON.parse(run.stdout.toString());
}

export function judge(folder: string): { verdicts: Verdict[]; duckdb: string } {
  const run = runQuery(folder);
  const found = run ? run.rows.map((row) => row[0]).sort() : [];
  const runs = run?.duckdb === DUCKDB_VERSION;
  const countMatches = runs && found.length === answerKey().length;
  const sameBills = JSON.stringify(found) === JSON.stringify(answerKey());
  return {
    duckdb: run?.duckdb ?? "none",
    verdicts: [
      { line: RUNS_LINE, result: runs ? "pass" : "fail" },
      { line: COUNT_LINE, result: countMatches && sameBills ? "pass" : "fail" },
    ],
  };
}

if (import.meta.main) {
  const folder = process.argv[2] ?? DATA_FOLDER;
  const { verdicts, duckdb } = judge(folder);
  writeFileSync(
    join(HERE, "result.json"),
    `${JSON.stringify({ duckdb, lines: verdicts }, null, 2)}\n`,
  );
  for (const verdict of verdicts) console.log(`  ${verdict.result.toUpperCase()}  ${verdict.line}`);
  const passed = verdicts.filter((verdict) => verdict.result === "pass").length;
  console.log(`${passed} of ${verdicts.length} lines pass. Wrote assignment/result.json`);
  process.exit(passed === verdicts.length ? 0 : 1);
}
