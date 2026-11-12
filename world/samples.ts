// Author tool: write each built step's solution/ and wrong/<mistake>/ folders from the finished close.
// A sample folder holds only the files a step makes or breaks; checks read every other file from the seed.
//   bun world/samples.ts
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { csvObjects, parseCsv, toCsv } from "../checks/lib/csv";
import { readXlsx, writeXlsx } from "../checks/lib/xlsx";
import { ROOT, SEED } from "../checks/lib/bakery";
import { findStep } from "../scripts/structure";
import { cleanOrders, fixPriceList, safetyRules, whatsHere, whyIAmHere } from "./close";

const work = mkdtempSync(join(tmpdir(), "wren-"));
cpSync(SEED, work, { recursive: true });
const recipeNames = ["Sourdough Loaf", "Seeded Rye Loaf", "White Tin Loaf", "Multigrain Loaf", "Croissant", "Pain au Chocolat", "Almond Croissant", "Cinnamon Bun", "Brownie", "Fruit Scone", "Cheese Scone", "Focaccia"];
whyIAmHere(work); whatsHere(work); safetyRules(work); cleanOrders(work); fixPriceList(work, recipeNames);
const made = (rel: string) => readFileSync(join(work, rel));
const seed = (rel: string) => readFileSync(join(SEED, rel), "utf8");

type Files = Record<string, string | Uint8Array>;
function sample(step: string, kind: string, files: Files) {
  const s = findStep(step);
  if (!s) throw new Error(`no step ${step}`);
  const dir = join(s.dir, kind);
  // prompts.md is written by a person from a real Claude Code session, so a rebuild keeps it.
  const promptsPath = join(dir, "prompts.md");
  const prompts = existsSync(promptsPath) ? readFileSync(promptsPath) : undefined;
  rmSync(dir, { recursive: true, force: true });
  if (prompts) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(promptsPath, prompts);
  }
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
}

// Orientation
sample("meet-the-bakery", "solution", { "out/why-i-am-here.md": "I want Claude to match our delivery notes to the orders so I stop doing it by hand.\n" });
sample("meet-the-bakery", "wrong/copied-the-example", { "out/why-i-am-here.md": "I want Claude to [the task you do by hand at work].\n" });
sample("meet-the-bakery", "wrong/empty-file", { "out/why-i-am-here.md": "\n" });

// read-the-folder
const whats = made("out/whats-here.md").toString();
sample("read-the-folder", "solution", { "out/whats-here.md": whats });
sample("read-the-folder", "wrong/missed-some-folders", { "out/whats-here.md": whats.split("\n").filter((l) => !/^- (till|notes)\//.test(l)).join("\n") });
sample("read-the-folder", "wrong/no-questions", { "out/whats-here.md": whats.split("## Questions I have")[0] });
sample("read-the-folder", "wrong/changed-an-original", { "out/whats-here.md": whats, "menu/menu.md": seed("menu/menu.md").replace("£4.00", "£4.20") });

// set-the-safety-rules
const safety = made("out/safety.md").toString();
const settings = (p: object) => JSON.stringify({ permissions: p }, null, 2) + "\n";
sample("set-the-safety-rules", "solution", { ".claude/settings.json": made(".claude/settings.json"), "out/safety.md": safety });
sample("set-the-safety-rules", "wrong/auto-mode", { ".claude/settings.json": settings({ defaultMode: "auto", blockWritesOutsideWorkingDirectories: true }), "out/safety.md": safety });
sample("set-the-safety-rules", "wrong/writes-not-blocked", { ".claude/settings.json": settings({ defaultMode: "default" }), "out/safety.md": safety });
sample("set-the-safety-rules", "wrong/broken-json", { ".claude/settings.json": '{\n  "permissions": {\n    "defaultMode": "default",\n    "blockWritesOutsideWorkingDirectories": true,\n  }\n}\n', "out/safety.md": safety });

// clean-the-orders
const clean = made("out/orders-clean.csv").toString();
const [head, ...body] = parseCsv(clean);
const raw = csvObjects(seed("orders/wholesale-orders.csv"));
const phone = new Set(raw.filter((r) => r.source === "phone").map((r) => r.order_id));
const monthFirst = body.map((r) => (phone.has(r[0]) ? [r[0], r[1].replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => (Number(d) <= 12 ? `${y}-${d}-${m}` : `${y}-${m}-${d}`)), ...r.slice(2)] : r));
sample("clean-the-orders", "solution", { "out/orders-clean.csv": clean });
sample("clean-the-orders", "wrong/month-first-dates", { "out/orders-clean.csv": toCsv([head, ...monthFirst]) });
sample("clean-the-orders", "wrong/duplicates-left", { "out/orders-clean.csv": toCsv([head, ...body, ...body.slice(10, 13)]) });
// Removing rows that share a cafe, product and date drops real orders too.
const seenKey = new Set<string>();
sample("clean-the-orders", "wrong/lost-real-orders", { "out/orders-clean.csv": toCsv([head, ...body.filter((r) => { const k = `${r[2]}|${r[3]}`; if (seenKey.has(k)) return false; seenKey.add(k); return true; })]) });
sample("clean-the-orders", "wrong/edited-the-original", { "out/orders-clean.csv": clean, "orders/wholesale-orders.csv": clean });

// fix-the-price-list
const priceRows = readXlsx(new Uint8Array(made("out/price-list-clean.xlsx")));
const changes = made("out/price-changes.md").toString();
sample("fix-the-price-list", "solution", { "out/price-list-clean.xlsx": made("out/price-list-clean.xlsx"), "out/price-changes.md": changes });
sample("fix-the-price-list", "wrong/pence-left", {
  "out/price-list-clean.xlsx": writeXlsx(priceRows.map((r) => (r[0] === "Cinnamon Bun" ? [r[0], r[1], 280, r[3]] : r))),
  "out/price-changes.md": changes,
});
sample("fix-the-price-list", "wrong/prices-saved-as-text", {
  "out/price-list-clean.xlsx": writeXlsx(priceRows.map((r, i) => (i === 0 ? r : [r[0], r[1], `£${Number(r[2]).toFixed(2)}`, `£${Number(r[3]).toFixed(2)}`]))),
  "out/price-changes.md": changes,
});
sample("fix-the-price-list", "wrong/changed-a-right-price", {
  "out/price-list-clean.xlsx": writeXlsx(priceRows.map((r) => (r[0] === "Sourdough Loaf" ? [r[0], r[1], 4.0, r[3]] : r))),
  "out/price-changes.md": changes + "- Sourdough Loaf: made the price match the menu, £4.00.\n",
});

rmSync(work, { recursive: true, force: true });
console.log(`Wrote the sample solutions and wrong answers under ${ROOT}.`);
