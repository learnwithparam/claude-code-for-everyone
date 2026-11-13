// The till connector: a small MCP server that lets Claude read the till, and never change it.
//
// Claude Code starts it from the bakery folder and talks to it over stdin and stdout. Each message
// is one line of JSON (JSON-RPC 2.0), as the MCP spec says: https://modelcontextprotocol.io
// It reads till/sales.csv and offers three tools: till_days, till_day and till_totals.
// Every tool call is written to out/till-log.jsonl, so a check can see that Claude asked the till.
//
// Add it from inside the bakery folder:
//   claude mcp add till --scope project -- bun ../parts/05-connect-and-schedule/till-server.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { csvObjects } from "../../checks/lib/csv";

// Claude Code tells a server where the project is. Started by hand, the server uses where it runs.
const BAKERY = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const TILL_FILE = join(BAKERY, "till", "sales.csv");
const LOG_FILE = join(BAKERY, "out", "till-log.jsonl");

type TillRow = Record<string, string>;
type Message = { id?: number | string; method?: string; params?: Record<string, unknown> };

function readTill(): TillRow[] {
  if (!existsSync(TILL_FILE)) throw new Error(`There is no till file at ${TILL_FILE}`);
  return csvObjects(readFileSync(TILL_FILE, "utf8"));
}

function pounds(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function addUp(rows: TillRow[], column: string): number {
  return rows.reduce((total, row) => total + Number(row[column]), 0);
}

// Sold, wasted and taken over some rows of the till.
function totalsOf(rows: TillRow[]) {
  return {
    itemsSold: addUp(rows, "sold"),
    itemsWasted: addUp(rows, "waste"),
    takings: pounds(addUp(rows, "takings")),
  };
}

// The product with the most waste over the whole till.
function mostWasted(rows: TillRow[]) {
  const wasteByProduct = new Map<string, number>();
  for (const row of rows) {
    const wasteSoFar = wasteByProduct.get(row.product) ?? 0;
    wasteByProduct.set(row.product, wasteSoFar + Number(row.waste));
  }
  const fromMostToLeast = [...wasteByProduct].sort((first, second) => second[1] - first[1]);
  const [product, itemsWasted] = fromMostToLeast[0];
  return { product, itemsWasted };
}

function tillDays() {
  const days = [...new Set(readTill().map((row) => row.date))].sort();
  return { firstDay: days[0], lastDay: days.at(-1), daysOpen: days.length, days };
}

function tillDay(date: string) {
  const rows = readTill().filter((row) => row.date === date);
  if (rows.length === 0) return { date, open: false, note: "The shop has no sales on this date." };
  const products = rows.map((row) => ({
    product: row.product,
    sold: Number(row.sold),
    waste: Number(row.waste),
    takings: Number(row.takings),
  }));
  return { date, open: true, ...totalsOf(rows), products };
}

function tillTotals() {
  const rows = readTill();
  const days = tillDays();
  return { from: days.firstDay, to: days.lastDay, ...totalsOf(rows), mostWasted: mostWasted(rows) };
}

const NO_INPUT = { type: "object", properties: {} };
const DATE_INPUT = {
  type: "object",
  properties: { date: { type: "string", description: "The day, written YYYY-MM-DD" } },
  required: ["date"],
};

const TOOLS = [
  {
    name: "till_days",
    description: "The days the shop was open, from the first to the last day in the till.",
    inputSchema: NO_INPUT,
  },
  {
    name: "till_day",
    description: "What sold on one day: each product, and the total sold, wasted and taken.",
    inputSchema: DATE_INPUT,
  },
  {
    name: "till_totals",
    description: "Totals over every day in the till: sold, wasted, takings, the most wasted.",
    inputSchema: NO_INPUT,
  },
];

// Write down each call, so the check can see that Claude used the till connector.
function logCall(tool: string, input: Record<string, unknown>) {
  mkdirSync(join(BAKERY, "out"), { recursive: true });
  const entry = { at: new Date().toISOString(), tool, input };
  appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
}

function runTool(tool: string, input: Record<string, unknown>): unknown {
  if (tool === "till_days") return tillDays();
  if (tool === "till_day") return tillDay(String(input.date ?? ""));
  if (tool === "till_totals") return tillTotals();
  throw new Error(`The till has no tool called ${tool}`);
}

// A tool answer goes back as text. A problem goes back as an error Claude can read.
function callTool(params: Record<string, unknown>) {
  const tool = String(params.name);
  const input = (params.arguments ?? {}) as Record<string, unknown>;
  logCall(tool, input);
  try {
    const answer = JSON.stringify(runTool(tool, input), null, 2);
    return { content: [{ type: "text", text: answer }] };
  } catch (error) {
    return { content: [{ type: "text", text: (error as Error).message }], isError: true };
  }
}

function hello(params: Record<string, unknown>) {
  return {
    protocolVersion: params.protocolVersion ?? "2025-06-18",
    capabilities: { tools: {} },
    serverInfo: { name: "till", version: "1.0.0" },
  };
}

// The answer to one request, or undefined when the method is not one the till knows.
function answer(message: Message): unknown {
  const params = message.params ?? {};
  if (message.method === "initialize") return hello(params);
  if (message.method === "ping") return {};
  if (message.method === "tools/list") return { tools: TOOLS };
  if (message.method === "tools/call") return callTool(params);
  return undefined;
}

function reply(message: Message) {
  // A message with no id is a notice, such as "initialized". It needs no reply.
  if (message.id === undefined) return;
  const result = answer(message);
  const response =
    result === undefined
      ? { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Unknown method" } }
      : { jsonrpc: "2.0", id: message.id, result };
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  if (!line.trim()) return;
  try {
    reply(JSON.parse(line));
  } catch {
    // A line that is not JSON is not a message, so the till ignores it.
  }
});
