// Author tool: take each step's picture, images/expected.png, from the real check.
// For each step, a fresh copy of the bakery gets the step's solution/ files. Then the real
// `bun run verify <step>` runs on it, and its output is drawn as a dark terminal and captured.
//   bun parts/05-connect-and-schedule/pictures.ts
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, SEED } from "../../checks/lib/bakery";
import { parts } from "../../scripts/structure";

const PART_NAME = "connect-and-schedule";

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

// The real check's output on a bakery that holds the step's sample solution.
function checkOutput(stepName: string, stepFolder: string): string {
  const bakery = join(mkdtempSync(join(tmpdir(), "wren-picture-")), "wren-street");
  cpSync(SEED, bakery, { recursive: true });
  cpSync(join(stepFolder, "solution"), bakery, { recursive: true });
  const result = spawnSync("bun", ["scripts/verify.ts", stepName], {
    cwd: ROOT,
    encoding: "utf8",
    // biome-ignore lint/style/useNamingConvention: environment variable names are in capitals.
    env: { ...process.env, WREN_STREET: bakery },
  });
  rmSync(join(bakery, ".."), { recursive: true, force: true });
  return result.stdout;
}

const part = parts().find((candidate) => candidate.name === PART_NAME);
if (!part) throw new Error(`There is no part called ${PART_NAME}.`);
const browser = await chromium.launch();
for (const step of part.steps) {
  const output = checkOutput(step.name, step.dir);
  const page = await browser.newPage({ viewport: { width: 860, height: 200 } });
  await page.setContent(terminalHtml(`bun run verify ${step.name}`, output));
  const picture = join(step.dir, "images", "expected.png");
  await (await page.$(".t"))?.screenshot({ path: picture });
  await page.close();
  console.log(`  ${picture.replace(`${ROOT}/`, "")}`);
}
await browser.close();
