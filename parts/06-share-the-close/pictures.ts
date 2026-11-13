// Author tool: take the pictures of this part, images/expected.png, from the real system.
// - publish-the-menu-page: the sample menu page in Chromium, at phone width.
// - run-the-friday-close: the real `bun run verify run-the-friday-close` on a bakery and a next
//   close made from the step's solution, drawn as a dark terminal.
//   bun parts/06-share-the-close/pictures.ts
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, SEED } from "../../checks/lib/bakery";
import { writeSeed } from "../../world/build";
import { nextCloseFiles } from "./next-close";

const PART = import.meta.dir;
const MENU_STEP = join(PART, "01-publish-the-menu-page");
const CLOSE_STEP = join(PART, "03-run-the-friday-close");

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// One line of output as HTML: PASS in green, FAIL in red, hints dimmed.
function colour(line: string): string {
  return escapeHtml(line)
    .replace(/^(\s*)PASS\b/, '$1<b class="ok">PASS</b>')
    .replace(/^(\s*)FAIL\b/, '$1<b class="bad">FAIL</b>')
    .replace(/^(\s*)Try next:/, '$1<span class="dim">Try next:</span>')
    .replace(/^(Done\..*)$/, '<b class="ok">$1</b>');
}

const STYLE = [
  "body{margin:0;background:#0f1115;padding:20px}",
  ".t{width:800px;background:#16181d;color:#d7dae0;border-radius:10px;overflow:hidden;" +
    "font:14px/1.55 ui-monospace,Menlo,Consolas,monospace}",
  ".bar{background:#22252b;padding:8px 12px;display:flex;gap:7px}" +
    ".bar i{width:11px;height:11px;border-radius:50%;background:#555;display:block}",
  "pre{margin:0;padding:14px 18px;white-space:pre-wrap}.p{color:#7cc4ff}" +
    ".ok{color:#5fd08f}.bad{color:#ff7b72}.dim{color:#9aa0aa}",
].join("\n");

function terminalHtml(command: string, output: string): string {
  const outputLines = output.trimEnd().split("\n");
  const lines = outputLines.map(colour).join("\n");
  const windowTop = '<div class="t"><div class="bar"><i></i><i></i><i></i></div>';
  const prompt = `<span class="p">$</span> ${escapeHtml(command)}`;
  return (
    `<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head>` +
    `<body>${windowTop}<pre>${prompt}\n${lines}</pre></div></body></html>`
  );
}

// The real check's output, on a bakery and a next close that hold the step's solution.
function closeCheckOutput(): string {
  const courseCopy = mkdtempSync(join(tmpdir(), "wren-picture-"));
  const bakery = join(courseCopy, "wren-street");
  const nextClose = join(courseCopy, "wren-street-next-close");
  cpSync(SEED, bakery, { recursive: true });
  writeSeed(nextClose, nextCloseFiles().files);
  cpSync(join(CLOSE_STEP, "solution"), nextClose, { recursive: true });
  const result = spawnSync("bun", ["scripts/verify.ts", "run-the-friday-close"], {
    cwd: ROOT,
    encoding: "utf8",
    // biome-ignore lint/style/useNamingConvention: environment variable names are in capitals.
    env: { ...process.env, WREN_STREET: bakery },
  });
  rmSync(courseCopy, { recursive: true, force: true });
  return result.stdout;
}

const browser = await chromium.launch();

const menuPage = await browser.newPage({ viewport: { width: 390, height: 700 } });
await menuPage.goto(`file://${join(MENU_STEP, "solution", "out", "site", "index.html")}`);
await menuPage.screenshot({ path: join(MENU_STEP, "images", "expected.png"), fullPage: true });
await menuPage.close();

const terminal = await browser.newPage({ viewport: { width: 860, height: 200 } });
await terminal.setContent(terminalHtml("bun run verify run-the-friday-close", closeCheckOutput()));
await (await terminal.$(".t"))?.screenshot({ path: join(CLOSE_STEP, "images", "expected.png") });
await browser.close();
console.log("Took the pictures for share-the-close.");
