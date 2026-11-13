// connect-the-till: the till is added to Claude Code as a connector (an MCP server), and Claude
// uses it to read one day's takings. The check reads .mcp.json, the till itself, the learner's
// out/till-today.md, and the till's own log of the calls Claude made.
import type { Rule } from "../scripts/verify";
import { bakeryRule, originalsUnchanged, text } from "./lib/bakery";
import { csvObjects } from "./lib/csv";

const CONNECTORS = ".mcp.json";
const ANSWER = "out/till-today.md";
const TILL_LOG = "out/till-log.jsonl";
const DATE = /\b(\d{4}-\d{2}-\d{2})\b/;

type Server = { command?: string; args?: string[] };

export function tillRows(folder: string): Record<string, string>[] {
  return csvObjects(text(folder, "till/sales.csv"));
}

// Every amount of money in a piece of text, like £474.35 or 1,204.50, as a number.
export function moneyIn(written: string): number[] {
  const amounts = written.match(/\d[\d,]*\.\d{2}\b/g) ?? [];
  return amounts.map((amount) => Number(amount.replace(/,/g, "")));
}

export const samePounds = (first: number, second: number) => Math.abs(first - second) < 0.005;

function tillServer(folder: string): Server | undefined {
  const connectors = JSON.parse(text(folder, CONNECTORS));
  return connectors.mcpServers?.till;
}

const writtenDate = (folder: string) => text(folder, ANSWER).match(DATE)?.[1];

function takingsOn(folder: string, date: string): number {
  const rows = tillRows(folder).filter((row) => row.date === date);
  return rows.reduce((total, row) => total + Number(row.takings), 0);
}

// The calls Claude made to the till, read from the log the till server writes.
function tillCalls(folder: string): { tool: string; input: { date?: string } }[] {
  const lines = text(folder, TILL_LOG).split("\n");
  const filledLines = lines.filter((line) => line.trim());
  return filledLines.map((line) => JSON.parse(line));
}

export default [
  bakeryRule,
  {
    says: `${CONNECTORS} is there and is valid`,
    test: (folder) => typeof JSON.parse(text(folder, CONNECTORS)) === "object",
    tryNext:
      "ask Claude to run the claude mcp add command from the step page, with --scope project",
  },
  {
    says: "it has a connector called till that starts till-server.ts",
    test: (folder) => {
      const server = tillServer(folder);
      const startCommand = [server?.command, ...(server?.args ?? [])].join(" ");
      return startCommand.includes("till-server.ts");
    },
    tryNext:
      'name the connector "till" and point it at ../parts/05-connect-and-schedule/till-server.ts',
  },
  {
    says: `${ANSWER} names a day the till has, written YYYY-MM-DD`,
    test: (folder) => {
      const date = writtenDate(folder);
      return date !== undefined && tillRows(folder).some((row) => row.date === date);
    },
    tryNext: "ask Claude to use the till_days tool and write the last day as YYYY-MM-DD",
  },
  {
    says: "the takings it gives match the till for that day",
    test: (folder) => {
      const date = writtenDate(folder) ?? "";
      const tillTakings = takingsOn(folder, date);
      const amounts = moneyIn(text(folder, ANSWER));
      return tillTakings > 0 && amounts.some((amount) => samePounds(amount, tillTakings));
    },
    tryNext: "ask Claude to use the till_day tool for that one day and copy its takings exactly",
  },
  {
    says: "Claude asked the till connector for that day (out/till-log.jsonl)",
    test: (folder) => {
      const date = writtenDate(folder);
      const calls = tillCalls(folder);
      return calls.some((call) => call.tool === "till_day" && call.input.date === date);
    },
    tryNext:
      "start claude again, approve the till connector, and ask Claude to use it, not the file",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
