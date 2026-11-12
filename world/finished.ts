// bun run finished: the finished system. It copies the bakery to finished/wren-street/, runs the whole
// Friday close on it, runs every step's check on the result, and writes finished/index.html to look at.
// With no key it uses recorded replies (LLM_PROVIDER=replay), so it works on a fresh clone.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { allSteps } from "../scripts/structure";
import type { Rule } from "../scripts/verify";
import { ROOT, SEED } from "../checks/lib/bakery";
import { csvObjects } from "../checks/lib/csv";
import { provider } from "../config/models";
import { runClose } from "./close";

const OUT = join(ROOT, "finished");
const FOLDER = join(OUT, "wren-street");

export async function finish(quiet = false) {
  const say = (s: string) => { if (!quiet) console.log(s); };
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(SEED, FOLDER, { recursive: true });
  say(`Running the Friday close on a fresh copy of the bakery (model provider: ${provider()}).`);
  await runClose(FOLDER, (s) => say(`  ${s}`));

  const results: { step: string; part: string; pass: boolean; failed: string[] }[] = [];
  for (const s of allSteps()) {
    const path = join(ROOT, "checks", `${s.name}.ts`);
    if (!existsSync(path)) continue;
    const rules: Rule[] = (await import(path)).default;
    const failed: string[] = [];
    for (const r of rules) {
      let ok = false;
      try { ok = await r.test(FOLDER); } catch { ok = false; }
      if (!ok) failed.push(r.says);
    }
    results.push({ step: s.name, part: s.part, pass: failed.length === 0, failed });
  }
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(join(OUT, "scorecard.md"), `# Scorecard\n\n| Step | Result |\n|---|---|\n${results.map((r) => `| ${r.step} | ${r.pass ? "PASS" : "FAIL"} |`).join("\n")}\n`);
  writeFileSync(join(OUT, "index.html"), page(results));
  for (const r of results) say(`  ${r.pass ? "PASS" : "FAIL"}  ${r.step}${r.pass ? "" : `: ${r.failed.join("; ")}`}`);
  say(`The Friday close ran. ${passed} of ${results.length} step checks pass on its work.`);
  say("Open finished/index.html in your browser to see it.");
  return { passed, total: results.length, folder: FOLDER };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const read = (rel: string) => readFileSync(join(FOLDER, rel), "utf8");

function page(results: { step: string; pass: boolean }[]): string {
  const before = csvObjects(readFileSync(join(SEED, "orders/wholesale-orders.csv"), "utf8")).slice(0, 6);
  const after = csvObjects(read("out/orders-clean.csv")).slice(0, 6);
  const recon = csvObjects(read("out/reconciliation.csv")).filter((r) => r.status !== "ok");
  const table = (rows: Record<string, string>[], cols: string[]) =>
    `<table><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</table>`;
  const report = read("out/reports/monday-report.md").split("\n").filter((l) => l.startsWith("- ")).map((l) => `<li>${esc(l.slice(2))}</li>`).join("");
  const label = read("out/labels/multigrain-loaf.md").split("\n").filter(Boolean).map((l) => `<div>${esc(l.replace(/^# /, ""))}</div>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The Friday close</title>
<style>
:root{--bg:#fbf7f0;--ink:#2b2118;--muted:#6b5a48;--line:#e3d8c6;--card:#fff;--pass:#1d7a46;--fail:#b3261e;--flag:#fdecea}
@media (prefers-color-scheme: dark){:root{--bg:#1d1814;--ink:#f3ece2;--muted:#b9a993;--line:#3a3129;--card:#262019;--pass:#5fd08f;--fail:#ff8a80;--flag:#3b2422}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px;font-size:28px}p.sub{margin:0 0 20px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;overflow-x:auto}
h2{font-size:16px;margin:0 0 8px}table{border-collapse:collapse;font-size:13px;width:100%}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
.flag td{background:var(--flag)}.score{display:flex;flex-wrap:wrap;gap:6px}.score span{font:12px ui-monospace,monospace;padding:3px 8px;border-radius:999px;border:1px solid var(--line)}
.pass{color:var(--pass)}.fail{color:var(--fail)}.label{font-family:Georgia,serif;border:2px dashed var(--line);padding:10px;border-radius:8px}ul{margin:0;padding-left:18px}
</style></head><body><main>
<h1>The Friday close at Wren Street Bakery</h1>
<p class="sub">What Claude made from the bakery folder, and what the checks say about it.</p>
<section style="margin-bottom:16px"><h2>Checks on this work</h2><div class="score">${results.map((r) => `<span class="${r.pass ? "pass" : "fail"}">${r.pass ? "PASS" : "FAIL"} ${r.step}</span>`).join("")}</div></section>
<div class="grid">
<section><h2>Orders before: three formats, four spellings</h2>${table(before, ["order_id", "order_date", "cafe", "quantity"])}</section>
<section><h2>Orders after: one format, one spelling</h2>${table(after, ["order_id", "order_date", "cafe", "quantity"])}</section>
<section><h2>Invoices that need action</h2>${table(recon, ["invoice", "status", "reason"])}</section>
<section><h2>The label that was out of date</h2><div class="label">${label}</div></section>
<section><h2>The Monday report, from the till</h2><ul>${report}</ul></section>
<section><h2>Price list fixes</h2><ul>${read("out/price-changes.md").split("\n").filter((l) => l.startsWith("- ")).map((l) => `<li>${esc(l.slice(2))}</li>`).join("")}</ul></section>
</div></main></body></html>
`;
}

if (import.meta.main) {
  const r = await finish();
  process.exit(r.passed === r.total ? 0 : 1);
}
