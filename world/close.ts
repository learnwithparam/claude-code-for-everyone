// The course author's answer key, as a plain script. world/samples.ts uses it to write each step's solution/ and
// wrong/ folders. This is not Claude and never stands in for it: the finished system is a real Claude Code run
// (world/finished.ts), and the checks read what Claude Code made.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { csvObjects, toCsv } from "../checks/lib/csv";
import { writeXlsx, xlsxObjects } from "../checks/lib/xlsx";
import { CAFES, QTY_WORDS } from "./data";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const put = (folder: string, rel: string, body: string | Uint8Array) => {
  const p = join(folder, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
};
const read = (folder: string, rel: string) => readFileSync(join(folder, rel), "utf8");
const money = (n: number) => `£${n.toFixed(2)}`;

export function isoDate(raw: string): string {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // phone orders: day first
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
  if (m)
    return `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  throw new Error(`unknown date "${raw}"`);
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
export function cafeName(raw: string): string {
  const f = fold(raw);
  const hit = CAFES.find((c) => c.spellings.some((s) => fold(s) === f) || fold(c.name) === f);
  if (!hit) throw new Error(`unknown cafe "${raw}"`);
  return hit.name;
}
const WORD_QTY = Object.fromEntries(Object.entries(QTY_WORDS).map(([n, w]) => [w, Number(n)]));
export const quantity = (raw: string) =>
  /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : WORD_QTY[raw.trim().toLowerCase()];

// Orientation
export function whyIAmHere(folder: string) {
  put(
    folder,
    "out/why-i-am-here.md",
    "I want Claude to match our delivery notes to the orders so I stop doing it by hand.\n",
  );
}

// Part 1
export function whatsHere(folder: string) {
  put(
    folder,
    "out/whats-here.md",
    `# What is in the bakery folder

- orders/: cafe orders from three places, in one messy file.
- customers/: the six cafes and the right spelling of each name.
- prices/: the price list as a spreadsheet.
- invoices/: 24 supplier invoices as PDFs.
- purchase-orders/: what the bakery ordered from suppliers.
- recipes/: one recipe for each of the 12 products.
- allergens/: the words to look for in a recipe.
- labels/: the labels on the shop shelf.
- menu/: the menu on the shop wall.
- till/: what sold each day.
- notes/: notes from Jess, the owner.
- out/: where new files go.

## Questions I have

- Why are some dates written in different ways?
- Do the labels match the recipes?
- Which invoices match a purchase order?
`,
  );
}

export function safetyRules(folder: string) {
  put(
    folder,
    ".claude/settings.json",
    `${JSON.stringify(
      { permissions: { defaultMode: "default", blockWritesOutsideWorkingDirectories: true } },
      null,
      2,
    )}\n`,
  );
  put(
    folder,
    "out/safety.md",
    `# How I keep the bakery folder safe

I work in Manual mode.

## Claude will ask me before

- it changes or makes a file
- it runs a command
`,
  );
}

export function cleanOrders(folder: string) {
  const rows = csvObjects(read(folder, "orders/wholesale-orders.csv"));
  const seen = new Set<string>();
  const out: (string | number)[][] = [["order_id", "order_date", "cafe", "product", "quantity"]];
  for (const r of rows) {
    if (seen.has(r.order_id)) continue;
    seen.add(r.order_id);
    out.push([
      r.order_id,
      isoDate(r.order_date),
      cafeName(r.cafe),
      r.product,
      quantity(r.quantity),
    ]);
  }
  put(folder, "out/orders-clean.csv", toCsv(out));
  return out.length - 1;
}

export function fixPriceList(folder: string, recipeNames: string[]) {
  const rows = xlsxObjects(new Uint8Array(readFileSync(join(folder, "prices/price-list.xlsx"))));
  const changes: string[] = [];
  const near = (a: string, b: string) => {
    const x = a.toLowerCase(),
      y = b.toLowerCase();
    return (
      x === y ||
      (x.length === y.length &&
        [...x].filter((c, i) => c !== y[i]).length <= 2 &&
        [...x].sort().join() === [...y].sort().join())
    );
  };
  const clean = rows.map((r) => {
    let product = String(r.product),
      unit = String(r.unit),
      shop = Number(r.shop_price),
      wholesale = Number(r.wholesale_price);
    const right = recipeNames.find((n) => near(n, product));
    if (right && right !== product) {
      changes.push(`${right}: the name was spelled "${product}".`);
      product = right;
    }
    if (shop >= 50) {
      changes.push(`${product}: the shop price was in pence (${shop}). Now ${money(shop / 100)}.`);
      shop = shop / 100;
    }
    if (unit !== "each") {
      changes.push(
        `${product}: the prices were for a ${unit}. Now each: ${money(shop / 12)} and ${money(wholesale / 12)}.`,
      );
      shop = +(shop / 12).toFixed(2);
      wholesale = +(wholesale / 12).toFixed(2);
      unit = "each";
    }
    return [product, unit, shop, wholesale];
  });
  put(
    folder,
    "out/price-list-clean.xlsx",
    writeXlsx([["product", "unit", "shop_price", "wholesale_price"], ...clean], "Prices"),
  );
  put(
    folder,
    "out/price-changes.md",
    `# Price list changes\n\n${changes.map((c) => `- ${c}`).join("\n")}\n`,
  );
  return changes.length;
}

// Part 2
export function houseRules(folder: string) {
  put(
    folder,
    "CLAUDE.md",
    `# Wren Street Bakery

## About the bakery

A family bakery with one shop. We bake bread and pastries and deliver to six cafes.

## Where things live

- Orders are in orders/. Cafe names are in customers/cafes.csv.
- Prices are in prices/. Invoices are in invoices/. What we ordered is in purchase-orders/.
- Put every new file in out/.

## Never do

- Never delete a file.
- Never change anything in till/ or purchase-orders/.
- Never email a cafe.

## Money rules

- Prices are in pounds with two decimals.
- The purchase order is the truth. An invoice that does not match it gets a flag.

## How to write

Short and friendly. Dates as YYYY-MM-DD.
`,
  );
}

type Invoice = { number: string; po: string; qty: number; price: number; total: number };
export function readInvoice(folder: string, file: string): Invoice {
  const t = read(folder, `invoices/${file}`);
  const grab = (re: RegExp) => t.match(re)?.[1] ?? "";
  const line = t.match(/\((\w[^()]*?)\s{2,}(\d+)\s+GBP ([\d.]+)\s+GBP ([\d.]+)\) Tj/);
  return {
    number: grab(/Invoice number: ([\w-]+)/),
    po: grab(/Your order: ([\w-]+)/),
    qty: Number(line?.[2]),
    price: Number(line?.[3]),
    total: Number(line?.[4]),
  };
}

export function reconcile(folder: string) {
  const pos = Object.fromEntries(
    csvObjects(read(folder, "purchase-orders/purchase-orders.csv")).map((p) => [p.po_number, p]),
  );
  const invoices = readdirSync(join(folder, "invoices"))
    .filter((f) => f.endsWith(".pdf"))
    .sort()
    .map((f) => readInvoice(folder, f));
  const seenPo: Record<string, string> = {};
  const out: string[][] = [["invoice", "po", "status", "reason"]];
  const flags: string[] = [];
  for (const inv of invoices.sort((a, b) =>
    a.number.localeCompare(b.number, "en", { numeric: true }),
  )) {
    const po = pos[inv.po];
    let status = "ok",
      reason = "matches the purchase order";
    if (seenPo[inv.po]) {
      status = "duplicate";
      reason = `same order and amount as ${seenPo[inv.po]}`;
    } else if (inv.price > Number(po.agreed_price) + 0.001) {
      status = "price above PO";
      reason = `billed £${inv.price.toFixed(2)}, agreed £${Number(po.agreed_price).toFixed(2)}`;
    } else if (inv.qty < Number(po.quantity)) {
      status = "short delivery";
      reason = `billed ${inv.qty}, ordered ${po.quantity}`;
    }
    seenPo[inv.po] ??= inv.number;
    out.push([inv.number, inv.po, status, reason]);
    if (status !== "ok") flags.push(`${inv.number} (${status}: ${reason})`);
  }
  put(folder, "out/reconciliation.csv", toCsv(out));
  put(
    folder,
    "out/reconciliation-note.md",
    `# Invoice check\n\n${flags.length} of ${invoices.length} invoices need action.\n\n${flags.map((f) => `- ${f}`).join("\n")}\n\nJess at Wren Street\n`,
  );
  return { flagged: flags.length, total: invoices.length };
}

// Part 4
export function labels(folder: string) {
  const words = csvObjects(read(folder, "allergens/allergen-list.csv"));
  const prices = xlsxObjects(
    new Uint8Array(readFileSync(join(folder, "out/price-list-clean.xlsx"))),
  );
  const made: string[] = [];
  for (const f of readdirSync(join(folder, "recipes"))
    .filter((f) => f.endsWith(".md"))
    .sort()) {
    const recipe = read(folder, `recipes/${f}`);
    const name = recipe.match(/^# (.+)$/m)?.[1];
    const ingredients = (recipe.split("## Ingredients")[1] ?? "")
      .split("## Method")[0]
      .toLowerCase();
    const found = words
      .filter((w) => w.look_for.split(";").some((x) => ingredients.includes(x.trim())))
      .map((w) => w.allergen);
    const price = Number(prices.find((p) => p.product === name)?.shop_price ?? 0);
    put(
      folder,
      `out/labels/${f}`,
      `# ${name}\n\nPrice: ${money(price)}\n\nContains: ${found.join(", ")}\n\nChecked by: Jess, the owner\n`,
    );
    made.push(name);
  }
  put(
    folder,
    "out/labels-done.md",
    `# A label is done when\n\n- [x] it names every allergen in its recipe\n- [x] its price matches the clean price list\n- [x] a person has signed the Checked by line\n- [x] sesame is on the Multigrain Loaf label\n`,
  );
  return made.length;
}

// Part 5
export function mondayReport(folder: string) {
  const till = csvObjects(read(folder, "till/sales.csv"));
  const sold = till.reduce((a, r) => a + Number(r.sold), 0);
  const waste = till.reduce((a, r) => a + Number(r.waste), 0);
  const takings = till.reduce((a, r) => a + Number(r.takings), 0);
  const wasteBy: Record<string, number> = {};
  for (const r of till) wasteBy[r.product] = (wasteBy[r.product] ?? 0) + Number(r.waste);
  const top = Object.entries(wasteBy).sort((a, b) => b[1] - a[1])[0];
  const summary = `The shop took ${money(takings)} and sold ${sold} items. ${waste} were wasted, most of them ${top[0]} (${top[1]}).`;
  put(
    folder,
    "out/reports/monday-report.md",
    `# The Monday report\n\n${summary}\n\n## Sales\n\n- Takings: ${money(takings)}\n- Items sold: ${sold}\n\n## Waste\n\n- Items wasted: ${waste}\n- Most waste: ${top[0]} (${top[1]})\n\n## Late payers\n\n- Kettle and Crumb\n- Moss and Grain\n`,
  );
  return { sold, waste, takings: +takings.toFixed(2) };
}

// Part 6
export function menuPage(folder: string) {
  const prices = xlsxObjects(
    new Uint8Array(readFileSync(join(folder, "out/price-list-clean.xlsx"))),
  );
  const items = prices.map((p) => {
    const slug = String(p.product).toLowerCase().replace(/ /g, "-");
    const label = existsSync(join(folder, `out/labels/${slug}.md`))
      ? read(folder, `out/labels/${slug}.md`)
      : "";
    const contains = label.match(/Contains: (.*)/)?.[1] ?? "";
    return `<li><span class="n">${p.product}</span><span class="p">${money(Number(p.shop_price))}</span><span class="a">Contains: ${contains}</span></li>`;
  });
  put(
    folder,
    "out/site/index.html",
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wren Street Bakery menu</title><style>body{font-family:Georgia,serif;max-width:640px;margin:0 auto;padding:16px;background:#fbf7f0;color:#2b2118}h1{font-size:28px}ul{list-style:none;padding:0}li{display:grid;grid-template-columns:1fr auto;padding:10px 0;border-bottom:1px solid #e3d8c6}.p{font-weight:bold}.a{grid-column:1/3;font-size:14px;color:#6b5a48}</style></head><body><h1>Wren Street Bakery</h1><p>Baked here every morning. Ask us about allergens.</p><ul>${items.join("")}</ul></body></html>\n`,
  );
  return items.length;
}
