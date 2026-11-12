// bun run pictures: retake every picture in the course from the real system.
// Pages are screenshots of real HTML. Command output is the real output, drawn as a dark terminal.
// Needs Playwright's Chromium. If it is missing, see images/SHOTS.md for each picture's command.
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { allSteps } from "../scripts/structure";

const ROOT = join(import.meta.dir, "..");

async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  const globalRoot = execSync("npm root -g").toString().trim();
  return createRequire(join(globalRoot, "noop.js"))("playwright");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const colour = (line: string) =>
  esc(line)
    .replace(/^(\s*)PASS\b/, '$1<b class="ok">PASS</b>')
    .replace(/^(\s*)FAIL\b/, '$1<b class="bad">FAIL</b>')
    .replace(/^(\s*)Try next:/, '$1<span class="dim">Try next:</span>')
    .replace(/^(Done\..*|Part .* is done.*|The Friday close ran\..*|Ready\..*)$/, '<b class="ok">$1</b>');

function terminalHtml(command: string, output: string) {
  const lines = output.trimEnd().split("\n").filter((l) => !l.startsWith("$ bun ") && !l.startsWith("error: script"));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#0f1115;padding:20px}
.t{width:800px;background:#16181d;color:#d7dae0;font:14px/1.55 ui-monospace,Menlo,Consolas,monospace;border-radius:10px;overflow:hidden}
.bar{background:#22252b;padding:8px 12px;display:flex;gap:7px}.bar i{width:11px;height:11px;border-radius:50%;background:#555;display:block}
pre{margin:0;padding:14px 18px;white-space:pre-wrap}.p{color:#7cc4ff}.ok{color:#5fd08f}.bad{color:#ff7b72}.dim{color:#9aa0aa}
</style></head><body><div class="t"><div class="bar"><i></i><i></i><i></i></div><pre><span class="p">$</span> ${esc(command)}
${lines.map(colour).join("\n")}</pre></div></body></html>`;
}

const run = (command: string, cwd: string, env: Record<string, string> = {}) => {
  const r = spawnSync("bash", ["-c", command], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
  return (r.stdout ?? "") + (r.stderr ?? "");
};

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();

async function shootHtml(html: string, out: string) {
  const page = await browser.newPage({ viewport: { width: 860, height: 200 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  mkdirSync(dirname(out), { recursive: true });
  await (await page.$(".t"))!.screenshot({ path: out });
  await page.close();
  console.log(`  ${out.replace(ROOT + "/", "")}`);
}
async function shootPage(file: string, out: string, width: number, height: number) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`file://${file}`);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  console.log(`  ${out.replace(ROOT + "/", "")}`);
}

console.log("Replaying the recorded Claude Code close, then taking pictures:");
// A replay of a recorded real run, so pictures cost no Claude usage and match the committed recording.
const finished = run("bun run finished", ROOT, { REPLAY: "1" });
const doctor = run("bun run doctor", ROOT);
const done = join(ROOT, "finished", "wren-street");
await shootPage(join(ROOT, "finished", "index.html"), join(ROOT, "images", "finished-system.png"), 1100, 900);
await shootPage(join(ROOT, "finished", "index.html"), join(ROOT, "00-orientation", "images", "finished-close.png"), 1100, 900);
await shootHtml(terminalHtml("bun run finished", finished), join(ROOT, "00-orientation", "images", "finished-run.png"));
await shootHtml(terminalHtml("bun run doctor", doctor), join(ROOT, "00-orientation", "images", "doctor.png"));
// Each step: the real check passing on the finished close's work, run as a learner would.
for (const s of allSteps()) {
  if (!s.meta.screen) continue;
  const out = run(`bun run verify ${s.name}`, ROOT, { WREN_STREET: done });
  await shootHtml(terminalHtml(`bun run verify ${s.name}`, out), join(s.dir, "images", "expected.png"));
}
await browser.close();
if (!existsSync(join(ROOT, "images", "finished-system.png"))) process.exit(1);
