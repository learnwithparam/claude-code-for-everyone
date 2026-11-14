// schedule-the-monday-report: the monday-report skill runs again with nobody asking, and every
// run keeps its own report. There are two ways to pass:
//   1. Scheduled: two reports made 55 or more minutes apart by a scheduled task.
//   2. Run now: two reports made at least one minute apart with Run now, plus out/schedule.md,
//      which gives the schedule as a cron line of numbers, and says why a person reads the
//      first run.
// The free plan and some work laptops cannot run scheduled tasks, so the second way is a real pass.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { section, words } from "./lib/md";
import { REPORT_RULES, reports } from "./write-the-monday-report";

const PLAN = "out/schedule.md";
const SCRIPT = "run-report.sh";
const LOOP_NOTE = "out/loop.md";
// A line like: /loop 1h Run the monday-report skill. An interval, then what to repeat.
const LOOP_LINE = /^\/loop\s+\d+\s*[smhd]\s+(.+)$/;
const MADE_AT = /^Made at:\s*(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/m;
const ONE_MINUTE = 60 * 1000;
const SCHEDULED_GAP = 55 * ONE_MINUTE;

// When each run made its report, read from the report's "Made at:" line, oldest first.
// A report with no "Made at:" line, like the one from the step before, is not a run here.
function madeAtTimes(folder: string): number[] {
  const times: number[] = [];
  for (const report of reports(folder)) {
    const found = text(folder, report).match(MADE_AT);
    if (!found) continue;
    const [, date, hours, minutes] = found;
    times.push(Date.parse(`${date}T${hours}:${minutes}:00Z`));
  }
  return times.sort((first, second) => first - second);
}

// The shortest time between two reports, so a copy made in the same minute is caught.
function shortestGap(folder: string): number {
  const times = madeAtTimes(folder);
  let shortest = Number.POSITIVE_INFINITY;
  for (let i = 1; i < times.length; i++) shortest = Math.min(shortest, times[i] - times[i - 1]);
  return shortest;
}

// The longest time between the first and the last report.
function longestGap(folder: string): number {
  const times = madeAtTimes(folder);
  return (times.at(-1) ?? 0) - (times[0] ?? 0);
}

// A cron line of five parts, numbers only: day and month names are not accepted by the app.
// The first part is the minute, and it must be one number, so the job runs at most once an hour.
export function isNumberCron(line: string): boolean {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const numbersOnly = parts.every((part) => /^[\d*,/-]+$/.test(part));
  return numbersOnly && /^\d{1,2}$/.test(parts[0]);
}

// The first line of out/schedule.md that is a cron line of numbers, with any backticks taken off.
function plannedCron(folder: string): string | undefined {
  const lines = text(folder, PLAN).split("\n");
  const linesWithoutBackticks = lines.map((line) => line.replace(/`/g, "").trim());
  return linesWithoutBackticks.find(isNumberCron);
}

function whyFirstRun(folder: string): boolean {
  const why = section(text(folder, PLAN), "why i read the first run") ?? "";
  return words(why).length >= 6;
}

// The script runs claude with -p (print the answer and stop, no chat) and asks for the skill.
function scriptRunsHeadless(folder: string): boolean {
  const script = text(folder, SCRIPT);
  const runsPrint = /^\s*claude\b[^\n]*\s(-p|--print)\b/m.test(script);
  return runsPrint && /monday-report/.test(script);
}

const scriptSkipsSafety = (folder: string) =>
  /--dangerously-skip-permissions|--permission-mode\s+bypassPermissions/.test(
    text(folder, SCRIPT),
  );

// The /loop line, with any backticks taken off, whose repeated part names the report.
function loopRepeatsReport(folder: string): boolean {
  const lines = text(folder, LOOP_NOTE).split("\n");
  const found = lines.map((line) => line.replace(/`/g, "").trim().match(LOOP_LINE));
  return found.some((match) => match !== null && /report/i.test(match[1]));
}

const ranOnSchedule = (folder: string) => longestGap(folder) >= SCHEDULED_GAP;
const plannedWithRunNow = (folder: string) =>
  has(folder, PLAN) && plannedCron(folder) !== undefined && whyFirstRun(folder);

const NEITHER_WAY = "it ran on a schedule, or out/schedule.md plans one (the Run now way)";

// Which way passed is only known after the test runs, so the line it prints is worked out then.
let wayThatPassed = NEITHER_WAY;

const scheduleRule: Rule = {
  get says() {
    return wayThatPassed;
  },
  test: (folder) => {
    wayThatPassed = NEITHER_WAY;
    if (ranOnSchedule(folder)) {
      wayThatPassed = "it ran on a schedule: two reports 55 or more minutes apart";
    } else if (plannedWithRunNow(folder)) {
      wayThatPassed = "the Run now way: out/schedule.md plans the schedule and the first run";
    }
    return wayThatPassed !== NEITHER_WAY;
  },
  tryNext:
    "wait for the next scheduled run, or write out/schedule.md with a cron line of numbers " +
    'and a "## Why I read the first run" part',
};

export default [
  bakeryRule,
  {
    says: '2 or more reports start with a "Made at:" line, like Made at: YYYY-MM-DD HH:MM',
    test: (folder) => madeAtTimes(folder).length >= 2,
    tryNext: "ask Claude to change the skill so each run makes a new report with a Made at line",
  },
  {
    says: "the reports were made at least one minute apart",
    test: (folder) => madeAtTimes(folder).length >= 2 && shortestGap(folder) >= ONE_MINUTE,
    tryNext: "a copy of a report does not count; let the task make each report itself",
  },
  ...REPORT_RULES,
  scheduleRule,
  {
    says: "run-report.sh runs claude with -p and asks for the monday-report skill",
    test: (folder) => has(folder, SCRIPT) && scriptRunsHeadless(folder),
    tryNext:
      "ask Claude to write run-report.sh with one line: claude -p and a prompt that names " +
      "the monday-report skill",
  },
  {
    says: "run-report.sh does not switch off the permission checks",
    test: (folder) => has(folder, SCRIPT) && !scriptSkipsSafety(folder),
    tryNext: "take --dangerously-skip-permissions out; use --allowedTools to name what it may do",
  },
  {
    says: "out/loop.md has a /loop line with an interval and the report it repeats",
    test: (folder) => has(folder, LOOP_NOTE) && loopRepeatsReport(folder),
    tryNext: "write a line like /loop 1h Run the monday-report skill in out/loop.md",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
