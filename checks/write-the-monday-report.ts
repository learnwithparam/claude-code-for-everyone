// write-the-monday-report: a monday-report skill, and a report it made from the till.
// Every number in the report must match the till, and the late payers must match Jess's notes.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { moneyIn, samePounds, tillRows } from "./connect-the-till";
import { bakeryRule, has, originalsUnchanged, text, workFolder } from "./lib/bakery";
import { csvObjects } from "./lib/csv";
import { bullets, fold, section } from "./lib/md";

const SKILL = ".claude/skills/monday-report/SKILL.md";
const REPORTS = "out/reports";
const CHECKER = ".claude/agents/numbers-checker.md";
const CHECK_NOTE = "out/numbers-check.md";
const WORKTREE_NOTE = "out/worktree.md";
// claude -w second-try makes the folder .claude/worktrees/second-try
// and the branch worktree-second-try.
const WORKTREE_FOLDER = /\.claude\/worktrees\/[\w.-]+/;
const WORKTREE_BRANCH = /\bworktree-[\w.-]+/;
// A subagent that checks must not be able to change anything.
const TOOLS_THAT_CHANGE = ["write", "edit", "bash", "notebookedit"];

// Every report file in out/reports/, as a path inside the bakery folder.
export function reports(folder: string): string[] {
  const reportFolder = join(workFolder(folder), REPORTS);
  if (!existsSync(reportFolder)) return [];
  const names = readdirSync(reportFolder).filter((name) => name.endsWith(".md"));
  return names.sort().map((name) => `${REPORTS}/${name}`);
}

// Whole numbers in a piece of text, like 4558 or 4,558. Money and dates are left out.
function wholeNumbersIn(written: string): number[] {
  const withoutMoneyOrDates = written.replace(/\d[\d,]*\.\d+|\d{4}-\d{2}-\d{2}/g, " ");
  const numbers = withoutMoneyOrDates.match(/\d[\d,]*/g) ?? [];
  return numbers.map((number) => Number(number.replace(/,/g, "")));
}

function addUp(rows: Record<string, string>[], column: string): number {
  return rows.reduce((total, row) => total + Number(row[column]), 0);
}

// The products with the most waste over the whole till. More than one when there is a tie.
function mostWasted(rows: Record<string, string>[]): string[] {
  const wasteByProduct: Record<string, number> = {};
  for (const row of rows) {
    wasteByProduct[row.product] = (wasteByProduct[row.product] ?? 0) + Number(row.waste);
  }
  const most = Math.max(...Object.values(wasteByProduct));
  return Object.keys(wasteByProduct).filter((product) => wasteByProduct[product] === most);
}

// The cafes Jess's notes say pay late: the cafes named on the line that says "pay late".
export function latePayers(folder: string): string[] {
  const notes = text(folder, "notes/owner-notes.md").split("\n");
  const payLateLine = fold(notes.find((line) => /pay late/i.test(line)) ?? "");
  const cafes = csvObjects(text(folder, "customers/cafes.csv")).map((cafe) => cafe.cafe);
  return cafes.filter((cafe) => payLateLine.includes(fold(cafe)));
}

const reportSection = (folder: string, report: string, heading: string) =>
  section(text(folder, report), heading) ?? "";

function salesMatch(folder: string, report: string): boolean {
  const rows = tillRows(folder);
  const sales = reportSection(folder, report, "sales");
  const takingsMatch = moneyIn(sales).some((amount) => samePounds(amount, addUp(rows, "takings")));
  return takingsMatch && wholeNumbersIn(sales).includes(addUp(rows, "sold"));
}

function wasteMatches(folder: string, report: string): boolean {
  const rows = tillRows(folder);
  const waste = reportSection(folder, report, "waste");
  const namesWorst = mostWasted(rows).some((product) => fold(waste).includes(fold(product)));
  return namesWorst && wholeNumbersIn(waste).includes(addUp(rows, "waste"));
}

function latePayersMatch(folder: string, report: string): boolean {
  const named = fold(bullets(reportSection(folder, report, "late payers")).join("\n"));
  const allCafes = csvObjects(text(folder, "customers/cafes.csv")).map((cafe) => cafe.cafe);
  const late = latePayers(folder);
  const everyLateCafe = late.every((cafe) => named.includes(fold(cafe)));
  const onTime = allCafes.filter((cafe) => !late.includes(cafe));
  return everyLateCafe && !onTime.some((cafe) => named.includes(fold(cafe)));
}

function hasHeadings(folder: string, report: string): boolean {
  const headings = ["sales", "waste", "late payers"];
  return headings.every((heading) => section(text(folder, report), heading) !== undefined);
}

// Every report in out/reports/ passes the test, and there is at least one.
export const everyReport =
  (test: (folder: string, report: string) => boolean) => (folder: string) => {
    const found = reports(folder);
    return found.length > 0 && found.every((report) => test(folder, report));
  };

export const REPORT_RULES: Rule[] = [
  {
    says: 'every report has "## Sales", "## Waste" and "## Late payers"',
    test: everyReport(hasHeadings),
    tryNext: "ask Claude to add the three headings to the skill's Steps, then run it again",
  },
  {
    says: "the takings and items sold match the till",
    test: everyReport(salesMatch),
    tryNext: "ask the skill to add up till/sales.csv with a script, or to use the till connector",
  },
  {
    says: "the items wasted and the most wasted product match the till",
    test: everyReport(wasteMatches),
    tryNext: "ask Claude to add the waste column and name the product with the most waste",
  },
  {
    says: "the late payers are the cafes in Jess's notes, and no others",
    test: everyReport(latePayersMatch),
    tryNext: "ask the skill to read the Cafes part of notes/owner-notes.md for who pays late",
  },
];

const frontmatter = (folder: string) =>
  text(folder, SKILL).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";

// The description in a skill's frontmatter, with any indented lines under it joined on.
export function skillDescription(front: string): string {
  const found = front.match(/^description:(.*(?:\r?\n[ \t]+.*)*)/m);
  return found ? found[1].replace(/\s+/g, " ").trim() : "";
}

function checkerFront(folder: string): string {
  return text(folder, CHECKER).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

function checkerToolList(folder: string): string[] {
  const line = checkerFront(folder).match(/^tools:\s*(.+)$/m)?.[1] ?? "";
  return line
    .split(",")
    .map((tool) => tool.trim().toLowerCase())
    .filter(Boolean);
}

function checkerIsReadOnly(folder: string): boolean {
  const tools = checkerToolList(folder);
  return tools.length > 0 && !tools.some((tool) => TOOLS_THAT_CHANGE.includes(tool));
}

function checkNoteSaysMatch(folder: string): boolean {
  const note = fold(text(folder, CHECK_NOTE));
  return bullets(note).length >= 3 && /match|agree/.test(note);
}

function worktreeNamed(folder: string): boolean {
  const note = text(folder, WORKTREE_NOTE);
  return WORKTREE_FOLDER.test(note) || WORKTREE_BRANCH.test(note);
}

// The rules for the skill and the report it makes. make-the-monday-skill checks these alone.
export const SKILL_RULES: Rule[] = [
  {
    says: `${SKILL} is there with name: monday-report`,
    test: (folder) => /^name:\s*monday-report\s*$/m.test(frontmatter(folder)),
    tryNext: "ask Claude to make the skill with a name: monday-report line between the --- lines",
  },
  {
    says: "its description says when to use it: for the report",
    test: (folder) => /\breport\b/i.test(skillDescription(frontmatter(folder))),
    tryNext: 'ask Claude for a description line that says "Use when asked for the Monday report"',
  },
  {
    says: 'the skill has a "## Steps" part and a "## Never" part',
    test: (folder) => {
      const skill = text(folder, SKILL);
      return /^## Steps/m.test(skill) && /^## Never/m.test(skill);
    },
    tryNext: 'ask Claude to add a "## Steps" heading and a "## Never" heading to the skill',
  },
  {
    says: "there is a report in out/reports/",
    test: (folder) => has(folder, SKILL) && reports(folder).length > 0,
    tryNext: "type /monday-report in Claude Code, so the skill writes out/reports/monday-report.md",
  },
  ...REPORT_RULES,
];

export default [
  bakeryRule,
  ...SKILL_RULES,
  {
    says: "a subagent numbers-checker is in .claude/agents/ and can only read files",
    test: (folder) => has(folder, CHECKER) && checkerIsReadOnly(folder),
    tryNext:
      "ask Claude to make .claude/agents/numbers-checker.md with the line tools: Read, Grep, Glob",
  },
  {
    says: "out/numbers-check.md lists what the subagent checked and says the report matches",
    test: (folder) => has(folder, CHECK_NOTE) && checkNoteSaysMatch(folder),
    tryNext:
      "ask the numbers-checker to check the report, then save its answer as numbers-check.md",
  },
  {
    says: "out/worktree.md names the worktree folder or branch of a second try",
    test: (folder) => has(folder, WORKTREE_NOTE) && worktreeNamed(folder),
    tryNext:
      "run claude -w second-try, then write the folder .claude/worktrees/second-try " +
      "or the branch worktree-second-try in out/worktree.md",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
