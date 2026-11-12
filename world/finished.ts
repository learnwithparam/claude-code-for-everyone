// bun run finished: the finished system. A fresh copy of the bakery gets the finished learner's Claude Code setup
// (world/finished/bakery: CLAUDE.md, .claude/settings.json, a hook and three skills), then the real Claude Code
// runs the Friday close on it with `claude -p`. Every step's check then reads the files Claude made.
//
// With Claude Code installed and signed in, this is a live run. With no `claude`, or in CI, it replays a recorded
// real run from world/recordings/: the files that run made, and its stream-json transcript. It says which.
//
//   bun run finished               live if it can, else replay world/recordings/close-1
//   bun run finished --replay 2    replay world/recordings/close-2
//   bun run finished --record 3    live run, then save it as world/recordings/close-3 (course authors only)
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, sep } from "node:path";
import { allSteps } from "../scripts/structure";
import type { Rule } from "../scripts/verify";
import { ROOT, SEED } from "../checks/lib/bakery";
import { csvObjects } from "../checks/lib/csv";
import { canRunLive, claudeStatus, cleanEnv, headlessArgs } from "../config/claude";

const OUT = join(ROOT, "finished");
const FOLDER = join(OUT, "wren-street");
const SETUP = join(import.meta.dir, "finished", "bakery");
const PROMPT = readFileSync(join(import.meta.dir, "finished", "prompt.txt"), "utf8").trim();
export const RECORDINGS = join(import.meta.dir, "recordings");

function filesUnder(dir: string, base = dir, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory() ? filesUnder(p, base, out) : out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}
const hash = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

// The bakery as a learner leaves it at the end of the course, before Claude runs the close.
export function prepare(folder = FOLDER) {
  rmSync(dirname(folder), { recursive: true, force: true });
  mkdirSync(dirname(folder), { recursive: true });
  cpSync(SEED, folder, { recursive: true });
  cpSync(SETUP, folder, { recursive: true });
  mkdirSync(join(folder, "out"), { recursive: true });
}

// One line for each thing Claude did, read from a stream-json event.
export function describe(event: any): string[] {
  if (event.type === "assistant") {
    return (event.message?.content ?? []).filter((c: any) => c.type === "tool_use").map((c: any) => {
      const i = c.input ?? {};
      const what = i.file_path ?? i.command ?? i.skill ?? i.pattern ?? i.path ?? "";
      return `Claude used ${c.name}${what ? `: ${String(what).replace(/^.*\/wren-street\/|<bakery>\//g, "").split("\n")[0].slice(0, 90)}` : ""}`;
    });
  }
  if (event.type === "result") return [`Claude finished after ${event.num_turns} turns${event.is_error ? ", with an error" : ""}.`];
  return [];
}

function liveRun(folder: string, say: (s: string) => void): Promise<{ transcript: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn("claude", headlessArgs(PROMPT), { cwd: folder, env: cleanEnv(), stdio: ["ignore", "pipe", "pipe"] });
    let transcript = "", buf = "", err = "";
    child.stdout.on("data", (d) => {
      transcript += d; buf += d;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) { try { for (const s of describe(JSON.parse(l))) say(`  ${s}`); } catch {} }
    });
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code !== 0 && err.trim()) say(`  claude said: ${err.trim().split("\n").slice(-3).join(" ")}`);
      resolve({ transcript, code: code ?? 1 });
    });
  });
}

// Take out what is private or names a model before a transcript is saved: paths, ids of this machine, usage.
export function scrub(transcript: string, folder: string): string {
  const drop = new Set(["rate_limit_event", "active_goal", "autocompact_state"]);
  const out: string[] = [];
  for (const line of transcript.split("\n")) {
    if (!line.trim()) continue;
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    if (drop.has(e.type)) continue;
    if (e.type === "system" && e.subtype === "init") {
      e = { type: "system", subtype: "init", cwd: "<bakery>", permissionMode: e.permissionMode, claude_code_version: e.claude_code_version, tools: e.tools, skills: (e.skills ?? []).filter((s: string) => ["friday-close", "allergen-label", "monday-report"].includes(s)), session_id: e.session_id };
    }
    if (e.type === "result") {
      e = { type: "result", subtype: e.subtype, is_error: e.is_error, num_turns: e.num_turns, duration_ms: e.duration_ms, result: e.result, permission_denials: e.permission_denials, session_id: e.session_id };
    }
    if (e.message) { delete e.message.model; delete e.message.usage; delete e.message.id; }
    delete e.request_id;
    if (e.session_id) e.session_id = "<session>";
    let s = JSON.stringify(e);
    s = s.split(folder).join("<bakery>").split(ROOT).join("<course>").split(process.env.HOME ?? "/nonexistent-home").join("<home>");
    s = s.replace(/\/tmp\/claude-[^"\\\s]*/g, "<tmp>").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").replace(/\bclaude-(opus|sonnet|haiku|fable)[\w.-]*/gi, "<model>").replace(/,"repository":"[^"]*"/g, "");
    out.push(s);
  }
  return out.join("\n") + "\n";
}

// What the run made or changed, compared with the bakery before the run.
function changedSince(before: Record<string, string>, folder: string): string[] {
  return filesUnder(folder).filter((f) => before[f] !== hash(join(folder, f)));
}

export function recordingDirs(): string[] {
  return existsSync(RECORDINGS) ? readdirSync(RECORDINGS).filter((d) => d.startsWith("close-") && existsSync(join(RECORDINGS, d, "transcript.jsonl"))).sort() : [];
}

export function replay(name: string, folder: string, say: (s: string) => void) {
  const dir = join(RECORDINGS, name);
  const meta = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
  say(`Replaying ${name}, a real run of Claude Code ${meta.claude_code_version} saved in world/recordings/. With Claude Code signed in, this runs live.`);
  cpSync(join(dir, "files"), folder, { recursive: true });
  for (const l of readFileSync(join(dir, "transcript.jsonl"), "utf8").split("\n")) {
    if (!l.trim()) continue;
    for (const s of describe(JSON.parse(l))) say(`  ${s}`);
  }
}

export async function checkFolder(folder: string) {
  const results: { step: string; part: string; pass: boolean; failed: string[] }[] = [];
  for (const s of allSteps()) {
    const path = join(ROOT, "checks", `${s.name}.ts`);
    if (!existsSync(path)) continue;
    const rules: Rule[] = (await import(path)).default;
    const failed: string[] = [];
    for (const r of rules) {
      let ok = false;
      try { ok = await r.test(folder); } catch { ok = false; }
      if (!ok) failed.push(r.says);
    }
    results.push({ step: s.name, part: s.part, pass: failed.length === 0, failed });
  }
  return results;
}

export async function finish(opts: { quiet?: boolean; replay?: string; record?: string } = {}) {
  const say = (s: string) => { if (!opts.quiet) console.log(s); };
  prepare();
  const status = claudeStatus();
  const live = !opts.replay && (opts.record !== undefined || canRunLive(status));
  if (live) {
    if (!canRunLive(status)) throw new Error("Recording needs Claude Code, signed in. Run bun run doctor.");
    say(`Claude Code ${status.version} is running the Friday close on a fresh copy of the bakery.`);
    say(`  claude ${headlessArgs(PROMPT).map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
    const before = Object.fromEntries(filesUnder(FOLDER).map((f) => [f, hash(join(FOLDER, f))]));
    const started = Date.now();
    const { transcript, code } = await liveRun(FOLDER, say);
    writeFileSync(join(OUT, "transcript.jsonl"), scrub(transcript, FOLDER));
    if (opts.record) {
      const dir = join(RECORDINGS, opts.record);
      rmSync(dir, { recursive: true, force: true });
      for (const f of changedSince(before, FOLDER)) {
        mkdirSync(dirname(join(dir, "files", f)), { recursive: true });
        cpSync(join(FOLDER, f), join(dir, "files", f));
      }
      writeFileSync(join(dir, "transcript.jsonl"), scrub(transcript, FOLDER));
      writeFileSync(join(dir, "run.json"), JSON.stringify({
        claude_code_version: status.version,
        recorded: new Date().toISOString().slice(0, 10),
        folder: "finished/wren-street (a fresh copy of world/seed/wren-street plus world/finished/bakery)",
        command: ["claude", ...headlessArgs(PROMPT)],
        exit_code: code,
        seconds: Math.round((Date.now() - started) / 1000),
      }, null, 2) + "\n");
      say(`Saved the run as world/recordings/${opts.record}/.`);
    }
  } else {
    const name = opts.replay ? (opts.replay.startsWith("close-") ? opts.replay : `close-${opts.replay}`) : recordingDirs()[0];
    if (!name || !existsSync(join(RECORDINGS, name, "run.json"))) throw new Error(`There is no recording called ${name ?? "close-1"}. See world/recordings/RECORD.md.`);
    replay(name, FOLDER, say);
  }

  const results = await checkFolder(FOLDER);
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(join(OUT, "scorecard.md"), `# Scorecard\n\n| Step | Result |\n|---|---|\n${results.map((r) => `| ${r.step} | ${r.pass ? "PASS" : "FAIL"} |`).join("\n")}\n`);
  writeFileSync(join(OUT, "index.html"), page(results, live));
  for (const r of results) say(`  ${r.pass ? "PASS" : "FAIL"}  ${r.step}${r.pass ? "" : `: ${r.failed.join("; ")}`}`);
  say(`The Friday close ran. ${passed} of ${results.length} step checks pass on what Claude made.`);
  say("Open finished/index.html in your browser to see it.");
  return { passed, total: results.length, folder: FOLDER, live };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const readOr = (rel: string) => (existsSync(join(FOLDER, rel)) ? readFileSync(join(FOLDER, rel), "utf8") : "");

function page(results: { step: string; pass: boolean }[], live: boolean): string {
  const before = csvObjects(readFileSync(join(SEED, "orders/wholesale-orders.csv"), "utf8")).slice(0, 6);
  const after = csvObjects(readOr("out/orders-clean.csv")).slice(0, 6);
  const recon = csvObjects(readOr("out/reconciliation.csv")).filter((r) => (r.status ?? "").trim().toLowerCase() !== "ok");
  const table = (rows: Record<string, string>[], cols: string[]) =>
    rows.length ? `<table><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</table>` : "<p>Not made.</p>";
  const pre = (rel: string) => { const t = readOr(rel); return t ? `<pre>${esc(t.trim())}</pre>` : "<p>Not made.</p>"; };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The Friday close</title>
<style>
:root{--bg:#fbf7f0;--ink:#2b2118;--muted:#6b5a48;--line:#e3d8c6;--card:#fff;--pass:#1d7a46;--fail:#b3261e}
@media (prefers-color-scheme: dark){:root{--bg:#1d1814;--ink:#f3ece2;--muted:#b9a993;--line:#3a3129;--card:#262019;--pass:#5fd08f;--fail:#ff8a80}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px;font-size:28px}p.sub{margin:0 0 20px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:16px}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;overflow-x:auto}
h2{font-size:16px;margin:0 0 8px}table{border-collapse:collapse;font-size:13px;width:100%}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
.score{display:flex;flex-wrap:wrap;gap:6px}.score span{font:12px ui-monospace,monospace;padding:3px 8px;border-radius:999px;border:1px solid var(--line)}
.pass{color:var(--pass)}.fail{color:var(--fail)}pre{margin:0;white-space:pre-wrap;font:13px/1.5 ui-monospace,monospace}
</style></head><body><main>
<h1>The Friday close at Wren Street Bakery</h1>
<p class="sub">What Claude Code made from the bakery folder${live ? "" : " (a recorded real run)"}, and what the checks say about it.</p>
<section style="margin-bottom:16px"><h2>Checks on this work</h2><div class="score">${results.map((r) => `<span class="${r.pass ? "pass" : "fail"}">${r.pass ? "PASS" : "FAIL"} ${r.step}</span>`).join("")}</div></section>
<div class="grid">
<section><h2>Orders before: three formats, four spellings</h2>${table(before, ["order_id", "order_date", "cafe", "quantity"])}</section>
<section><h2>Orders after: one format, one spelling</h2>${table(after, ["order_id", "order_date", "cafe", "quantity"])}</section>
<section><h2>Invoices that need action</h2>${table(recon, ["invoice", "status", "reason"])}</section>
<section><h2>The label that was out of date</h2>${pre("out/labels/multigrain-loaf.md")}</section>
<section><h2>The Monday report, from the till</h2>${pre("out/reports/monday-report.md")}</section>
<section><h2>Price list fixes</h2>${pre("out/price-changes.md")}</section>
</div></main></body></html>
`;
}

if (import.meta.main) {
  const a = process.argv.slice(2);
  const flag = (n: string) => { const i = a.indexOf(n); return i < 0 ? undefined : (a[i + 1] ?? "1"); };
  const rec = flag("--record");
  try {
    const r = await finish({ replay: flag("--replay"), record: rec ? (rec.startsWith("close-") ? rec : `close-${rec}`) : undefined });
    process.exit(r.passed === r.total ? 0 : 1);
  } catch (e) {
    console.log((e as Error).message);
    process.exit(2);
  }
}
