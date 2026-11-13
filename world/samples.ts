// Author tool: write each built step's solution/ and wrong/<mistake>/ folders from the answer key
// in world/close.ts. A sample folder holds only the files a step makes or breaks; the checks read
// every other file from the seed.
//   bun world/samples.ts
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ROOT, SEED } from "../checks/lib/bakery";
import { csvObjects, parseCsv, toCsv } from "../checks/lib/csv";
import { readXlsx, writeXlsx } from "../checks/lib/xlsx";
import { findStep } from "../scripts/structure";
import { cleanOrders, fixPriceList, safetyRules, whatsHere, whyImHere } from "./close";

// A copy of the bakery to run the answer key in, so the seed stays as it is.
const work = mkdtempSync(join(tmpdir(), "wren-"));
cpSync(SEED, work, { recursive: true });
const recipeNames = [
  "Sourdough Loaf",
  "Seeded Rye Loaf",
  "White Tin Loaf",
  "Multigrain Loaf",
  "Croissant",
  "Pain au Chocolat",
  "Almond Croissant",
  "Cinnamon Bun",
  "Brownie",
  "Fruit Scone",
  "Cheese Scone",
  "Focaccia",
];
whyImHere(work);
whatsHere(work);
safetyRules(work);
cleanOrders(work);
fixPriceList(work, recipeNames);
// A file the answer key made, and a file as the seed has it.
const made = (relativePath: string) => readFileSync(join(work, relativePath));
const seed = (relativePath: string) => readFileSync(join(SEED, relativePath), "utf8");

// Each file's path inside the sample folder, and what goes in it.
type Files = Record<string, string | Uint8Array>;

// Write one sample folder, such as solution/ or wrong/empty-file/, for a step.
function sample(stepName: string, kind: string, files: Files) {
  const step = findStep(stepName);
  if (!step) throw new Error(`no step ${stepName}`);
  const folder = join(step.dir, kind);
  // prompts.md is written by a person from a real Claude Code session, so a rebuild keeps it.
  const promptsPath = join(folder, "prompts.md");
  const prompts = existsSync(promptsPath) ? readFileSync(promptsPath) : undefined;
  rmSync(folder, { recursive: true, force: true });
  if (prompts) {
    mkdirSync(folder, { recursive: true });
    writeFileSync(promptsPath, prompts);
  }
  for (const [relativePath, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, relativePath)), { recursive: true });
    writeFileSync(join(folder, relativePath), contents);
  }
}

// Orientation
sample("meet-the-bakery", "solution", {
  "out/why-i-am-here.md":
    "I want Claude to match our delivery notes to the orders so I stop doing it by hand.\n",
});
sample("meet-the-bakery", "wrong/copied-the-example", {
  "out/why-i-am-here.md": "I want Claude to [the task you do by hand at work].\n",
});
sample("meet-the-bakery", "wrong/empty-file", { "out/why-i-am-here.md": "\n" });

// read-the-folder
const whats = made("out/whats-here.md").toString();
sample("read-the-folder", "solution", { "out/whats-here.md": whats });
sample("read-the-folder", "wrong/missed-some-folders", {
  "out/whats-here.md": whats
    .split("\n")
    .filter((line) => !/^- (till|notes)\//.test(line))
    .join("\n"),
});
sample("read-the-folder", "wrong/no-questions", {
  "out/whats-here.md": whats.split("## Questions I have")[0],
});
sample("read-the-folder", "wrong/changed-an-original", {
  "out/whats-here.md": whats,
  "menu/menu.md": seed("menu/menu.md").replace("£4.00", "£4.20"),
});

// set-the-safety-rules
const safety = made("out/safety.md").toString();
const settings = (permissions: object) => `${JSON.stringify({ permissions }, null, 2)}\n`;
sample("set-the-safety-rules", "solution", {
  ".claude/settings.json": made(".claude/settings.json"),
  "out/safety.md": safety,
});
sample("set-the-safety-rules", "wrong/auto-mode", {
  ".claude/settings.json": settings({
    defaultMode: "auto",
    blockWritesOutsideWorkingDirectories: true,
  }),
  "out/safety.md": safety,
});
sample("set-the-safety-rules", "wrong/writes-not-blocked", {
  ".claude/settings.json": settings({ defaultMode: "default" }),
  "out/safety.md": safety,
});
sample("set-the-safety-rules", "wrong/broken-json", {
  ".claude/settings.json":
    // The comma after true makes this JSON broken.
    '{\n  "permissions": {\n    "defaultMode": "default",\n' +
    '    "blockWritesOutsideWorkingDirectories": true,\n  }\n}\n',
  "out/safety.md": safety,
});

// clean-the-orders
const clean = made("out/orders-clean.csv").toString();
const [head, ...body] = parseCsv(clean);
const rawOrders = csvObjects(seed("orders/wholesale-orders.csv"));
const phoneOrders = rawOrders.filter((order) => order.source === "phone");
const phoneOrderIds = new Set(phoneOrders.map((order) => order.order_id));
// The mistake: reading a phone order's day-first date as month first, where that makes a date.
function swapDayAndMonth(date: string): string {
  return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, year, month, day) =>
    Number(day) <= 12 ? `${year}-${day}-${month}` : `${year}-${month}-${day}`,
  );
}
const monthFirst = body.map((row) => {
  if (!phoneOrderIds.has(row[0])) return row;
  return [row[0], swapDayAndMonth(row[1]), ...row.slice(2)];
});
sample("clean-the-orders", "solution", { "out/orders-clean.csv": clean });
sample("clean-the-orders", "wrong/month-first-dates", {
  "out/orders-clean.csv": toCsv([head, ...monthFirst]),
});
sample("clean-the-orders", "wrong/duplicates-left", {
  "out/orders-clean.csv": toCsv([head, ...body, ...body.slice(10, 13)]),
});
// Removing rows that share a cafe and product drops real orders too.
const seenCafeAndProduct = new Set<string>();
sample("clean-the-orders", "wrong/lost-real-orders", {
  "out/orders-clean.csv": toCsv([
    head,
    ...body.filter((row) => {
      const cafeAndProduct = `${row[2]}|${row[3]}`;
      if (seenCafeAndProduct.has(cafeAndProduct)) return false;
      seenCafeAndProduct.add(cafeAndProduct);
      return true;
    }),
  ]),
});
sample("clean-the-orders", "wrong/edited-the-original", {
  "out/orders-clean.csv": clean,
  "orders/wholesale-orders.csv": clean,
});

// fix-the-price-list
const priceRows = readXlsx(new Uint8Array(made("out/price-list-clean.xlsx")));
const changes = made("out/price-changes.md").toString();
sample("fix-the-price-list", "solution", {
  "out/price-list-clean.xlsx": made("out/price-list-clean.xlsx"),
  "out/price-changes.md": changes,
});
sample("fix-the-price-list", "wrong/pence-left", {
  "out/price-list-clean.xlsx": writeXlsx(
    priceRows.map((row) => (row[0] === "Cinnamon Bun" ? [row[0], row[1], 280, row[3]] : row)),
  ),
  "out/price-changes.md": changes,
});
sample("fix-the-price-list", "wrong/prices-saved-as-text", {
  "out/price-list-clean.xlsx": writeXlsx(
    priceRows.map((row, i) => {
      // Row 0 is the header.
      if (i === 0) return row;
      const shop = `£${Number(row[2]).toFixed(2)}`;
      const wholesale = `£${Number(row[3]).toFixed(2)}`;
      return [row[0], row[1], shop, wholesale];
    }),
  ),
  "out/price-changes.md": changes,
});
sample("fix-the-price-list", "wrong/changed-a-right-price", {
  "out/price-list-clean.xlsx": writeXlsx(
    priceRows.map((row) => (row[0] === "Sourdough Loaf" ? [row[0], row[1], 4.0, row[3]] : row)),
  ),
  "out/price-changes.md": `${changes}- Sourdough Loaf: made the price match the menu, £4.00.\n`,
});

rmSync(work, { recursive: true, force: true });
console.log(`Wrote the sample solutions and wrong answers under ${ROOT}.`);
