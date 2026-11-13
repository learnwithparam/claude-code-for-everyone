// bun run finished: the finished system. A fresh copy of the bakery gets the finished learner's
// Claude Code setup (world/finished/bakery: CLAUDE.md, .claude/settings.json, a hook and three
// skills). Then the real Claude Code runs the Friday close on it with `claude -p`.
// Then the check of each step the close covers reads the files Claude made.
//
// With Claude Code installed and signed in, this is a live run. With no `claude`, or in CI, it
// replays a recorded real run from world/recordings/: the files that run made, and its stream-json
// transcript. It says which one it did.
//
//   bun run finished               live if it can, else replay world/recordings/close-1
//   bun run finished --replay 2    replay world/recordings/close-2
//   bun run finished --record 3    live run, then save it as world/recordings/close-3
//                                  (for course authors only)
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { ROOT, SEED } from "../checks/lib/bakery";
import { csvObjects } from "../checks/lib/csv";
import {
  type ClaudeStatus,
  canRunLive,
  claudeStatus,
  cleanEnv,
  headlessArgs,
} from "../config/claude";
import { allSteps } from "../scripts/structure";
import type { Rule } from "../scripts/verify";

const OUTPUT_FOLDER = join(ROOT, "finished");
const BAKERY_FOLDER = join(OUTPUT_FOLDER, "wren-street");
const LEARNER_SETUP = join(import.meta.dir, "finished", "bakery");
const PROMPT = readFileSync(join(import.meta.dir, "finished", "prompt.txt"), "utf8").trim();
export const RECORDINGS = join(import.meta.dir, "recordings");

type Say = (line: string) => void;

// One tool call inside a stream-json event from `claude -p`.
type ToolCall = { type?: string; name?: string; input?: Record<string, unknown> };

// One stream-json event from `claude -p`. Claude Code names the fields, so they stay as they are.
type StreamEvent = {
  type?: string;
  subtype?: string;
  message?: { content?: ToolCall[]; model?: unknown; usage?: unknown; id?: unknown };
  // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
  num_turns?: number;
  // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
  is_error?: boolean;
  // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
  session_id?: string;
  // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
  request_id?: string;
  [field: string]: unknown;
};

type StepResult = { step: string; part: string; pass: boolean; failed: string[] };

// The steps the finished run proves. The setup (house rules, safety rules, why-i-am-here.md)
// covers three of them, and the friday-close skill makes the files for the other seven.
// Steps a person must do by hand (sign the labels, make a save point, open the terminal)
// or that use a second folder (run-the-friday-close) are not part of one close.
export const CLOSE_STEPS = [
  "meet-the-bakery",
  "read-the-folder",
  "set-the-safety-rules",
  "clean-the-orders",
  "fix-the-price-list",
  "write-the-house-rules",
  "reconcile-the-invoices",
  "build-the-label-skill",
  "write-the-monday-report",
  "publish-the-menu-page",
];

// Every file in a folder and the folders inside it, written with / and relative to the top folder.
function filesUnder(folder: string, top = folder, found: string[] = []): string[] {
  if (!existsSync(folder)) return found;
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) {
      filesUnder(path, top, found);
    } else {
      found.push(relative(top, path).split(sep).join("/"));
    }
  }
  return found;
}

// A fingerprint of a file's bytes, so we can tell later whether the file changed.
function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// The bakery as a learner leaves it at the end of the course, before Claude runs the close.
export function prepare(folder = BAKERY_FOLDER) {
  rmSync(dirname(folder), { recursive: true, force: true });
  mkdirSync(dirname(folder), { recursive: true });
  cpSync(SEED, folder, { recursive: true });
  cpSync(LEARNER_SETUP, folder, { recursive: true });
  mkdirSync(join(folder, "out"), { recursive: true });
}

// One line for each thing Claude did, read from a stream-json event.
export function describe(event: StreamEvent): string[] {
  if (event.type === "assistant") {
    const parts = event.message?.content ?? [];
    return parts.filter((part) => part.type === "tool_use").map(describeToolCall);
  }
  if (event.type === "result") {
    const error = event.is_error ? ", with an error" : "";
    return [`Claude finished after ${event.num_turns} turns${error}.`];
  }
  return [];
}

// "Claude used Read: orders/wholesale-orders.csv", with the bakery folder's path taken off.
function describeToolCall(call: ToolCall): string {
  const input = call.input ?? {};
  const target =
    input.file_path ?? input.command ?? input.skill ?? input.pattern ?? input.path ?? "";
  if (!target) return `Claude used ${call.name}`;
  const shortTarget = String(target).replace(/^.*\/wren-street\/|<bakery>\//g, "");
  const firstLine = shortTarget.split("\n")[0];
  return `Claude used ${call.name}: ${firstLine.slice(0, 90)}`;
}

// Print what Claude did, if this line of output is a stream-json event.
function sayWhatClaudeDid(line: string, say: Say) {
  try {
    // biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: our own describe
    for (const step of describe(JSON.parse(line))) say(`  ${step}`);
  } catch {
    // A line that is not JSON is not an event, so there is nothing to say.
  }
}

function liveRun(folder: string, say: Say): Promise<{ transcript: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn("claude", headlessArgs(PROMPT), {
      cwd: folder,
      env: cleanEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let transcript = "";
    let unfinishedLine = "";
    let errors = "";
    child.stdout.on("data", (chunk) => {
      transcript += chunk;
      unfinishedLine += chunk;
      const lines = unfinishedLine.split("\n");
      // Output arrives in pieces, so the last line may be cut. Keep it until the rest arrives.
      unfinishedLine = lines.pop() ?? "";
      for (const line of lines) sayWhatClaudeDid(line, say);
    });
    child.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    child.on("close", (code) => {
      if (code !== 0 && errors.trim()) {
        const lastLines = errors.trim().split("\n").slice(-3);
        say(`  claude said: ${lastLines.join(" ")}`);
      }
      resolve({ transcript, code: code ?? 1 });
    });
  });
}

// Events that say nothing about the close, so a saved transcript leaves them out.
const DROPPED_EVENTS = new Set<unknown>(["rate_limit_event", "active_goal", "autocompact_state"]);
const BAKERY_SKILLS = ["friday-close", "allergen-label", "monday-report"];

// Take out what is private or names a model before a transcript is saved:
// paths, ids of this machine, usage.
export function scrub(transcript: string, folder: string): string {
  const kept: string[] = [];
  for (const line of transcript.split("\n")) {
    const event = parseEvent(line);
    if (event === undefined) continue;
    if (DROPPED_EVENTS.has(event.type)) continue;
    kept.push(hidePrivateText(JSON.stringify(trimEvent(event)), folder));
  }
  return `${kept.join("\n")}\n`;
}

// The event on this line, or undefined when the line is empty or not JSON.
function parseEvent(line: string): StreamEvent | undefined {
  if (!line.trim()) return undefined;
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

// The event with only the fields worth keeping.
function trimEvent(event: StreamEvent): StreamEvent {
  let trimmed = event;
  if (event.type === "system" && event.subtype === "init") trimmed = trimStartEvent(event);
  if (event.type === "result") trimmed = trimResultEvent(event);
  if (trimmed.message) {
    delete trimmed.message.model;
    delete trimmed.message.usage;
    delete trimmed.message.id;
  }
  delete trimmed.request_id;
  if (trimmed.session_id) trimmed.session_id = "<session>";
  return trimmed;
}

// The first event of a run, which also lists everything installed on this machine.
function trimStartEvent(event: StreamEvent): StreamEvent {
  const skills = (event.skills ?? []) as string[];
  return {
    type: "system",
    subtype: "init",
    cwd: "<bakery>",
    permissionMode: event.permissionMode,
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    claude_code_version: event.claude_code_version,
    tools: event.tools,
    skills: skills.filter((skill) => BAKERY_SKILLS.includes(skill)),
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    session_id: event.session_id,
  };
}

// The last event of a run, without its usage and cost.
function trimResultEvent(event: StreamEvent): StreamEvent {
  return {
    type: "result",
    subtype: event.subtype,
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    is_error: event.is_error,
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    num_turns: event.num_turns,
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    duration_ms: event.duration_ms,
    result: event.result,
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    permission_denials: event.permission_denials,
    // biome-ignore lint/style/useNamingConvention: Claude Code names this field.
    session_id: event.session_id,
  };
}

// Swap paths, email addresses and model names for placeholders like <bakery> and <model>.
function hidePrivateText(text: string, folder: string): string {
  const home = process.env.HOME ?? "/nonexistent-home";
  let safe = text.split(folder).join("<bakery>");
  safe = safe.split(ROOT).join("<course>");
  safe = safe.split(home).join("<home>");
  safe = safe.replace(/\/tmp\/claude-[^"\\\s]*/g, "<tmp>");
  safe = safe.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>");
  safe = safe.replace(/\bclaude-(opus|sonnet|haiku|fable)[\w.-]*/gi, "<model>");
  return safe.replace(/,"repository":"[^"]*"/g, "");
}

// What the run made or changed, compared with the bakery before the run.
function changedSince(before: Record<string, string>, folder: string): string[] {
  return filesUnder(folder).filter((file) => before[file] !== fileHash(join(folder, file)));
}

export function recordingDirs(): string[] {
  if (!existsSync(RECORDINGS)) return [];
  const isRecording = (name: string) =>
    name.startsWith("close-") && existsSync(join(RECORDINGS, name, "transcript.jsonl"));
  return readdirSync(RECORDINGS).filter(isRecording).sort();
}

// "2" and "close-2" both mean the recording in world/recordings/close-2.
function recordingName(asked: string): string {
  return asked.startsWith("close-") ? asked : `close-${asked}`;
}

export function replay(name: string, folder: string, say: Say) {
  const recording = join(RECORDINGS, name);
  const details = JSON.parse(readFileSync(join(recording, "run.json"), "utf8"));
  say(
    `Replaying ${name}, a real run of Claude Code ${details.claude_code_version} ` +
      "saved in world/recordings/. With Claude Code signed in, this runs live.",
  );
  cpSync(join(recording, "files"), folder, { recursive: true });
  const transcript = readFileSync(join(recording, "transcript.jsonl"), "utf8");
  for (const line of transcript.split("\n")) {
    if (!line.trim()) continue;
    // biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: our own describe
    for (const step of describe(JSON.parse(line))) say(`  ${step}`);
  }
}

// The rules a step's check says, for each rule that does not hold on this folder.
async function rulesThatFail(rules: Rule[], folder: string): Promise<string[]> {
  const failed: string[] = [];
  for (const rule of rules) {
    let ok = false;
    try {
      ok = await rule.test(folder);
    } catch {
      ok = false;
    }
    if (!ok) failed.push(rule.says);
  }
  return failed;
}

export async function checkFolder(folder: string): Promise<StepResult[]> {
  const results: StepResult[] = [];
  const closeSteps = allSteps().filter((step) => CLOSE_STEPS.includes(step.name));
  for (const step of closeSteps) {
    const checkFile = join(ROOT, "checks", `${step.name}.ts`);
    if (!existsSync(checkFile)) continue;
    const rules: Rule[] = (await import(checkFile)).default;
    const failed = await rulesThatFail(rules, folder);
    results.push({ step: step.name, part: step.part, pass: failed.length === 0, failed });
  }
  return results;
}

type FinishOptions = { quiet?: boolean; replay?: string; record?: string };

export async function finish(options: FinishOptions = {}) {
  const say: Say = (line) => {
    if (!options.quiet) console.log(line);
  };
  prepare();
  const status = claudeStatus();
  const live = !options.replay && (options.record !== undefined || canRunLive(status));
  if (live) {
    await runLive(status, options.record, say);
  } else {
    replay(chooseRecording(options.replay), BAKERY_FOLDER, say);
  }

  const results = await checkFolder(BAKERY_FOLDER);
  const passed = results.filter((result) => result.pass).length;
  writeFileSync(join(OUTPUT_FOLDER, "scorecard.md"), scorecard(results));
  writeFileSync(join(OUTPUT_FOLDER, "index.html"), page(results, live));
  for (const result of results) say(resultLine(result));
  say(`The Friday close ran. ${passed} of ${results.length} step checks pass on what Claude made.`);
  say("Open finished/index.html in your browser to see it.");
  return { passed, total: results.length, folder: BAKERY_FOLDER, live };
}

// The recording asked for, or the first one there is.
function chooseRecording(asked: string | undefined): string {
  let name: string | undefined;
  if (asked) {
    name = recordingName(asked);
  } else {
    name = recordingDirs()[0];
  }
  if (!name || !existsSync(join(RECORDINGS, name, "run.json"))) {
    const missing = name ?? "close-1";
    throw new Error(`There is no recording called ${missing}. See world/recordings/RECORD.md.`);
  }
  return name;
}

// Show an argument the way you would type it: in quotes when it has a space.
function asTyped(argument: string): string {
  return /\s/.test(argument) ? JSON.stringify(argument) : argument;
}

async function runLive(status: ClaudeStatus, record: string | undefined, say: Say) {
  if (!canRunLive(status))
    throw new Error("Recording needs Claude Code, signed in. Run bun run doctor.");
  say(`Claude Code ${status.version} is running the Friday close on a fresh copy of the bakery.`);
  say(`  claude ${headlessArgs(PROMPT).map(asTyped).join(" ")}`);
  const before = Object.fromEntries(
    filesUnder(BAKERY_FOLDER).map((file) => [file, fileHash(join(BAKERY_FOLDER, file))]),
  );
  const started = Date.now();
  const { transcript, code } = await liveRun(BAKERY_FOLDER, say);
  writeFileSync(join(OUTPUT_FOLDER, "transcript.jsonl"), scrub(transcript, BAKERY_FOLDER));
  if (record) {
    saveRecording({ name: record, before, transcript, code, started, version: status.version });
    say(`Saved the run as world/recordings/${record}/.`);
  }
}

type LiveRunToSave = {
  name: string;
  before: Record<string, string>;
  transcript: string;
  code: number;
  started: number;
  version?: string;
};

// Save a live run in world/recordings/, so anyone can replay it without Claude Code.
function saveRecording(run: LiveRunToSave) {
  const recording = join(RECORDINGS, run.name);
  rmSync(recording, { recursive: true, force: true });
  for (const file of changedSince(run.before, BAKERY_FOLDER)) {
    const copy = join(recording, "files", file);
    mkdirSync(dirname(copy), { recursive: true });
    cpSync(join(BAKERY_FOLDER, file), copy);
  }
  writeFileSync(join(recording, "transcript.jsonl"), scrub(run.transcript, BAKERY_FOLDER));
  const details = {
    // biome-ignore lint/style/useNamingConvention: run.json uses the same name as Claude Code.
    claude_code_version: run.version,
    recorded: new Date().toISOString().slice(0, 10),
    folder:
      "finished/wren-street (a fresh copy of world/seed/wren-street " +
      "plus world/finished/bakery)",
    command: ["claude", ...headlessArgs(PROMPT)],
    // biome-ignore lint/style/useNamingConvention: the tests read run.json with this name.
    exit_code: run.code,
    seconds: Math.round((Date.now() - run.started) / 1000),
  };
  writeFileSync(join(recording, "run.json"), `${JSON.stringify(details, null, 2)}\n`);
}

function passOrFail(pass: boolean): string {
  return pass ? "PASS" : "FAIL";
}

function scorecard(results: StepResult[]): string {
  const rows = results.map((result) => `| ${result.step} | ${passOrFail(result.pass)} |`);
  return `# Scorecard\n\n| Step | Result |\n|---|---|\n${rows.join("\n")}\n`;
}

// "  FAIL  clean-the-orders: why it failed", or just "  PASS  clean-the-orders".
function resultLine(result: StepResult): string {
  const why = result.pass ? "" : `: ${result.failed.join("; ")}`;
  return `  ${passOrFail(result.pass)}  ${result.step}${why}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The text of a file Claude made in the bakery, or "" if it did not make it.
function readIfMade(relativePath: string): string {
  const path = join(BAKERY_FOLDER, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

// Column names in the files are codes. A reader sees words.
const HEADINGS: Record<string, string> = {
  // biome-ignore-start lint/style/useNamingConvention: these keys are the column names in the files
  order_id: "Order",
  order_date: "Date",
  cafe: "Cafe",
  quantity: "Quantity",
  invoice: "Invoice",
  status: "Problem",
  reason: "Details",
  // biome-ignore-end lint/style/useNamingConvention: see above
};
const heading = (column: string) => HEADINGS[column] ?? column;

// What an invoice problem is called on the page. Claude words it freely, so unknown ones are kept.
function problemLabel(status: string): string {
  const text = status.trim().toLowerCase();
  if (text.startsWith("price above")) return "Price above the order";
  if (text.startsWith("short") || text.startsWith("quantity")) return "Quantity differs";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function htmlTable(rows: Record<string, string>[], columns: string[]): string {
  if (!rows.length) return "<p>Claude Code did not make this file.</p>";
  const header = columns.map((column) => `<th>${heading(column)}</th>`).join("");
  const body = rows.map((row) => htmlTableRow(row, columns)).join("");
  return `<table><tr>${header}</tr>${body}</table>`;
}

function htmlTableRow(row: Record<string, string>, columns: string[]): string {
  const cells = columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`);
  return `<tr>${cells.join("")}</tr>`;
}

// A file Claude made, shown as it is, or a plain note if it is missing or empty.
function fileAsHtml(relativePath: string): string {
  const text = readIfMade(relativePath);
  return text
    ? `<pre>${escapeHtml(text.trim())}</pre>`
    : "<p>Claude Code did not make this file.</p>";
}

function scoreBadges(results: { step: string; pass: boolean }[]): string {
  const badges = results.map((result) => {
    const colour = result.pass ? "pass" : "fail";
    return `<span class="${colour}">${passOrFail(result.pass)} ${result.step}</span>`;
  });
  return badges.join("");
}

function section(title: string, body: string): string {
  return `<section><h2>${title}</h2>${body}</section>`;
}

const PAGE_HEAD =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  "<title>The Friday close</title>";

// Each string is one line of the page's style sheet.
const PAGE_STYLE = [
  ":root{--bg:#fbf7f0;--ink:#2b2118;--muted:#6b5a48;--line:#e3d8c6;--card:#fff;" +
    "--pass:#1d7a46;--fail:#b3261e}",
  "@media (prefers-color-scheme: dark){:root{--bg:#1d1814;--ink:#f3ece2;--muted:#b9a993;" +
    "--line:#3a3129;--card:#262019;--pass:#5fd08f;--fail:#ff8a80}}",
  "body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}",
  "main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px;font-size:28px}" +
    "p.sub{margin:0 0 20px;color:var(--muted)}",
  ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:16px}",
  "section{background:var(--card);border:1px solid var(--line);border-radius:10px;" +
    "padding:14px 16px;overflow-x:auto}",
  "h2{font-size:16px;margin:0 0 8px}table{border-collapse:collapse;font-size:13px;width:100%}" +
    "th,td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--line)}",
  ".score{display:flex;flex-wrap:wrap;gap:6px}.score span{font:12px ui-monospace,monospace;" +
    "padding:3px 8px;border-radius:999px;border:1px solid var(--line)}",
  ".pass{color:var(--pass)}.fail{color:var(--fail)}" +
    "pre{margin:0;white-space:pre-wrap;font:13px/1.5 ui-monospace,monospace}",
].join("\n");

const ORDER_COLUMNS = ["order_id", "order_date", "cafe", "quantity"];

// finished/index.html: what Claude made next to what the bakery started with.
function page(results: { step: string; pass: boolean }[], live: boolean): string {
  const ordersAsSent = readFileSync(join(SEED, "orders/wholesale-orders.csv"), "utf8");
  const ordersBefore = csvObjects(ordersAsSent).slice(0, 6);
  const ordersAfter = csvObjects(readIfMade("out/orders-clean.csv")).slice(0, 6);
  const invoices = csvObjects(readIfMade("out/reconciliation.csv"));
  const invoicesToFix = invoices.filter(
    (invoice) => (invoice.status ?? "").trim().toLowerCase() !== "ok",
  );
  const invoicesToShow = invoicesToFix.map((row) => ({
    ...row,
    status: problemLabel(row.status ?? ""),
  }));
  const runNote = live ? "" : " (a recorded real run)";
  const madeFrom = `What Claude Code made from the bakery folder${runNote}`;
  const subtitle = `${madeFrom}, and what the checks say about it.`;
  const checks = `<h2>Checks on this work</h2><div class="score">${scoreBadges(results)}</div>`;
  return [
    PAGE_HEAD,
    "<style>",
    PAGE_STYLE,
    '</style></head><body data-audience="staff"><main>',
    "<h1>The Friday close at Wren Street Bakery</h1>",
    `<p class="sub">${subtitle}</p>`,
    `<section style="margin-bottom:16px">${checks}</section>`,
    '<div class="grid">',
    section("Orders before: three formats, four spellings", htmlTable(ordersBefore, ORDER_COLUMNS)),
    section("Orders after: one format, one spelling", htmlTable(ordersAfter, ORDER_COLUMNS)),
    section(
      "Invoices that need action",
      htmlTable(invoicesToShow, ["invoice", "status", "reason"]),
    ),
    section("The label that was out of date", fileAsHtml("out/labels/multigrain-loaf.md")),
    section("The Monday report, from the till", fileAsHtml("out/reports/monday-report.md")),
    section("Price list fixes", fileAsHtml("out/price-changes.md")),
    "</div></main></body></html>",
    "",
  ].join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  // The word after a flag, or "1" when the flag is the last word.
  const flagValue = (flag: string) => {
    const i = args.indexOf(flag);
    return i < 0 ? undefined : (args[i + 1] ?? "1");
  };
  const record = flagValue("--record");
  try {
    const outcome = await finish({
      replay: flagValue("--replay"),
      record: record ? recordingName(record) : undefined,
    });
    process.exit(outcome.passed === outcome.total ? 0 : 1);
  } catch (error) {
    console.log((error as Error).message);
    process.exit(2);
  }
}
