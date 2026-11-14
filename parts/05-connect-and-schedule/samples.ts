// Author tool: write the solution/ and wrong/<mistake>/ folders of every step in this part.
// A sample folder holds only the files a step makes or breaks; the checks read the rest from the
// seed. The numbers come from the answer key in world/close.ts, never typed in by hand.
//   bun parts/05-connect-and-schedule/samples.ts
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SEED } from "../../checks/lib/bakery";
import { csvObjects } from "../../checks/lib/csv";
import { mondayReport } from "../../world/close";
import { writeSample } from "./write-sample";

const PART = import.meta.dir;
const work = mkdtempSync(join(tmpdir(), "wren-part-five-"));
cpSync(SEED, work, { recursive: true });
mondayReport(work);
const report = readFileSync(join(work, "out/reports/monday-report.md"), "utf8");
rmSync(work, { recursive: true, force: true });

const sample = (step: string, kind: string, files: Record<string, string>) =>
  writeSample(join(PART, step, kind), files);

// ---- open-the-terminal ----

function terminalNote(version: string, statusBar: string, mode: string): string {
  return (
    "# My terminal\n\n" +
    `## Version\n\n\`\`\`text\n${version}\n\`\`\`\n\n` +
    `## Status bar in Plan mode\n\n\`\`\`text\n${statusBar}\n\`\`\`\n\n` +
    `## Mode I work in\n\n${mode}\n`
  );
}

const PLAN_STATUS = "⏸ plan mode on (shift+tab to cycle)";
const MANUAL = "Manual. The status bar shows no mode, so Claude asks before each change.";
sample("01-open-the-terminal", "solution", {
  "out/terminal.md": terminalNote("2.1.323 (Claude Code)", PLAN_STATUS, MANUAL),
});
sample("01-open-the-terminal", "wrong/old-version", {
  "out/terminal.md": terminalNote("2.0.76 (Claude Code)", PLAN_STATUS, MANUAL),
});
sample("01-open-the-terminal", "wrong/left-in-auto-mode", {
  "out/terminal.md": terminalNote("2.1.323 (Claude Code)", PLAN_STATUS, "Auto mode"),
});
sample("01-open-the-terminal", "wrong/never-saw-plan-mode", {
  "out/terminal.md": terminalNote("2.1.323 (Claude Code)", "? for shortcuts", MANUAL),
});

// ---- connect-the-till ----

const till = csvObjects(readFileSync(join(SEED, "till/sales.csv"), "utf8"));
const lastDay = till.at(-1)?.date ?? "";
const addTakings = (rows: Record<string, string>[]) =>
  rows.reduce((total, row) => total + Number(row.takings), 0);
const lastDayTakings = addTakings(till.filter((row) => row.date === lastDay));
const wholeTillTakings = addTakings(till);

const connectors = {
  mcpServers: {
    till: {
      type: "stdio",
      command: "bun",
      args: ["../parts/05-connect-and-schedule/till-server.ts"],
      env: {},
    },
  },
};
const connectorsFile = `${JSON.stringify(connectors, null, 2)}\n`;

function tillToday(takings: number): string {
  return (
    "# The till, last day open\n\n" +
    `- Day: ${lastDay}\n- Takings: £${takings.toFixed(2)}\n\n` +
    "From the till connector.\n"
  );
}

const daysCall = { at: "2026-11-13T09:12:04.120Z", tool: "till_days", input: {} };
const dayCall = { at: "2026-11-13T09:12:09.880Z", tool: "till_day", input: { date: lastDay } };
const tillLog = `${JSON.stringify(daysCall)}\n${JSON.stringify(dayCall)}\n`;

sample("02-connect-the-till", "solution", {
  ".mcp.json": connectorsFile,
  "out/till-today.md": tillToday(lastDayTakings),
  "out/till-log.jsonl": tillLog,
});
sample("02-connect-the-till", "wrong/read-the-file-not-the-till", {
  ".mcp.json": connectorsFile,
  "out/till-today.md": tillToday(lastDayTakings),
});
sample("02-connect-the-till", "wrong/whole-till-total", {
  ".mcp.json": connectorsFile,
  "out/till-today.md": tillToday(wholeTillTakings),
  "out/till-log.jsonl": tillLog,
});
sample("02-connect-the-till", "wrong/no-connector", {
  "out/till-today.md": tillToday(lastDayTakings),
});

// ---- write-the-monday-report ----

const SKILL_START = `---
name: monday-report
description: >-
  Write the Monday report for Wren Street Bakery from the till.
  Use when asked for the Monday report, sales, waste or who pays late.
---

# The Monday report

## Steps

1. Use the till connector (till_totals), or add up till/sales.csv with a script.
   Never add up in your head.
2. Read notes/owner-notes.md for the cafes that pay late.
`;
const SKILL_NEVER = `
## Never

- Never guess or round a number. Every number comes from the till.
- Never change till/sales.csv.
`;
const skill =
  `${SKILL_START}3. Write out/reports/monday-report.md. Start with a two sentence summary. ` +
  'Then add "## Sales" (takings and items sold), "## Waste" (items wasted and the most ' +
  `wasted product) and "## Late payers" (one dash line per cafe).\n${SKILL_NEVER}`;

const guessed = report
  .replace(/£13,?609\.80/g, "about £13,600")
  .replace(/Items sold: \d+/, "Items sold: about 4,500");
const everyCafe = report.replace(
  /## Late payers[\s\S]*$/,
  "## Late payers\n\n- Lumen Cafe\n- Kettle and Crumb\n- Hartley Corner Cafe\n" +
    "- Bluebell Coffee\n- Moss and Grain\n- Pier Nine Espresso\n",
);
const CHECKER_START = `---
name: numbers-checker
description: Checks a report against till/sales.csv. Use after the Monday report is written.
`;
const CHECKER_BODY = `---

You check numbers. You never write or change a file.

1. Read the report you are given.
2. Read till/sales.csv and add up takings, items sold and items wasted.
3. Say, one line each, whether the report matches. Name any number that differs.
`;
const checker = (tools: string) => `${CHECKER_START}tools: ${tools}\n${CHECKER_BODY}`;
const CHECKER_PATH = ".claude/agents/numbers-checker.md";
const CHECK_NOTE_PATH = "out/numbers-check.md";
const checkNote = `# Numbers check

Checked by the numbers-checker subagent. It could only read files.

- Takings: matches till/sales.csv.
- Items sold: matches till/sales.csv.
- Items wasted: matches till/sales.csv.
- Verdict: the report matches the till.
`;
const subagentFiles = {
  [CHECKER_PATH]: checker("Read, Grep, Glob"),
  [CHECK_NOTE_PATH]: checkNote,
};
const WORKTREE_PATH = "out/worktree.md";
const worktreeNote = (named: string) =>
  `# My second try\n\n## Worktree\n\n${named}\n\n` +
  "I ran the skill again there. My own folder did not change.\n";
const worktreeFiles = { [WORKTREE_PATH]: worktreeNote("```text\n.claude/worktrees/second-try\n```") };
const SKILL_PATH = ".claude/skills/monday-report/SKILL.md";
const REPORT_PATH = "out/reports/monday-report.md";
sample("03-make-the-monday-skill", "solution", { [SKILL_PATH]: skill, [REPORT_PATH]: report });
sample("03-make-the-monday-skill", "wrong/guessed-numbers", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: guessed,
});
sample("03-make-the-monday-skill", "wrong/every-cafe-is-late", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: everyCafe,
});
sample("03-make-the-monday-skill", "wrong/no-skill", { [REPORT_PATH]: report });
sample("04-write-the-monday-report", "solution", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: report,
  ...subagentFiles,
  ...worktreeFiles,
});
sample("04-write-the-monday-report", "wrong/guessed-numbers", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: guessed,
  ...subagentFiles,
  ...worktreeFiles,
});
sample("04-write-the-monday-report", "wrong/every-cafe-is-late", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: everyCafe,
  ...subagentFiles,
  ...worktreeFiles,
});
sample("04-write-the-monday-report", "wrong/no-skill", {
  [REPORT_PATH]: report,
  ...subagentFiles,
  ...worktreeFiles,
});
sample("04-write-the-monday-report", "wrong/checker-can-edit-files", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: report,
  [CHECKER_PATH]: checker("Read, Grep, Glob, Write, Edit"),
  [CHECK_NOTE_PATH]: checkNote,
  ...worktreeFiles,
});
sample("04-write-the-monday-report", "wrong/never-ran-the-checker", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: report,
  [CHECKER_PATH]: checker("Read, Grep, Glob"),
  ...worktreeFiles,
});
sample("04-write-the-monday-report", "wrong/no-worktree-named", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: report,
  ...subagentFiles,
  [WORKTREE_PATH]: worktreeNote("I tried it in a second place and it was fine."),
});

// ---- schedule-the-monday-report ----

const scheduledSkill =
  `${SKILL_START}3. Run the date command for the time now. ` +
  "Save the report as a new file, out/reports/monday-report-<YYYY-MM-DD-HHMM>.md. " +
  "Never write over an old report.\n" +
  '4. Start the report with "Made at: <YYYY-MM-DD HH:MM>". Then write a two sentence summary, ' +
  'then "## Sales", "## Waste" and "## Late payers".\n' +
  SKILL_NEVER;
const madeAt = (time: string) => report.replace(/^# /, `Made at: 2026-11-13 ${time}\n\n# `);
const reportAt = (time: string) =>
  `out/reports/monday-report-2026-11-13-${time.replace(":", "")}.md`;

function schedulePlan(cron: string): string {
  return (
    "# The Monday report schedule\n\n" +
    `## Schedule\n\n\`\`\`text\n${cron}\n\`\`\`\n\n` +
    "At 07:00 on the first day the shop opens, from the Custom box.\n\n" +
    "## Why I read the first run\n\n" +
    "A job that runs alone can be wrong with nobody watching. " +
    "So I read the first report and check its numbers against the till. " +
    "Then I let the job run by itself.\n"
  );
}

const RUN_SCRIPT = `#!/bin/bash
# Run the Monday report with nobody at the keyboard.
cd "$(dirname "$0")"
claude -p "Run the monday-report skill." --permission-mode acceptEdits \\
  --allowedTools "Skill" "mcp__till" "Bash(date)" "Read" "Write"
`;
const FENCE = "```";
const loopNote = (line: string) =>
  `# My loop\n\n## Line\n\n${FENCE}text\n${line}\n${FENCE}\n\n` +
  "It repeats the report while I am in the session.\n";
const goodLoop = loopNote("/loop 1h Run the monday-report skill and tell me if a number changed.");
const unattended = { "run-report.sh": RUN_SCRIPT, "out/loop.md": goodLoop };

const twoRuns = {
  [SKILL_PATH]: scheduledSkill,
  [reportAt("07:00")]: madeAt("07:00"),
  [reportAt("07:03")]: madeAt("07:03"),
};
sample("05-schedule-the-monday-report", "solution", {
  ...twoRuns,
  ...unattended,
  "out/schedule.md": schedulePlan("0 7 * * 2"),
});
sample("05-schedule-the-monday-report", "wrong/one-report-written-over", {
  [SKILL_PATH]: skill,
  [REPORT_PATH]: madeAt("07:03"),
  ...unattended,
  "out/schedule.md": schedulePlan("0 7 * * 2"),
});
sample("05-schedule-the-monday-report", "wrong/day-names-in-cron", {
  ...twoRuns,
  ...unattended,
  "out/schedule.md": schedulePlan("0 7 * * TUE"),
});
sample("05-schedule-the-monday-report", "wrong/runs-every-minute", {
  ...twoRuns,
  ...unattended,
  "out/schedule.md": schedulePlan("* * * * *"),
});
sample("05-schedule-the-monday-report", "wrong/copied-a-report", {
  [SKILL_PATH]: scheduledSkill,
  [reportAt("07:00")]: madeAt("07:00"),
  ...unattended,
  "out/reports/monday-report-copy.md": madeAt("07:00"),
  "out/schedule.md": schedulePlan("0 7 * * 2"),
});

const solutionFiles = { ...twoRuns, "out/schedule.md": schedulePlan("0 7 * * 2") };
sample("05-schedule-the-monday-report", "wrong/script-without-p", {
  ...solutionFiles,
  "out/loop.md": goodLoop,
  "run-report.sh": RUN_SCRIPT.replace('claude -p "', 'claude "'),
});
sample("05-schedule-the-monday-report", "wrong/script-skips-permissions", {
  ...solutionFiles,
  "out/loop.md": goodLoop,
  "run-report.sh": RUN_SCRIPT.replace("--permission-mode acceptEdits", "--dangerously-skip-permissions"),
});
sample("05-schedule-the-monday-report", "wrong/loop-repeats-nothing", {
  ...solutionFiles,
  "run-report.sh": RUN_SCRIPT,
  "out/loop.md": loopNote("/loop 1h"),
});

console.log("Wrote the samples for connect-and-schedule.");
