// Author tool: rebuild world/seed/wren-street and world/key.json from world/data.ts.
// The same seed number always gives the same bytes, so the committed seed only changes when the data does.
//   bun world/build.ts
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { toCsv } from "../checks/lib/csv";
import { writeXlsx } from "../checks/lib/xlsx";
import { textPdf } from "./pdf";
import { ALLERGEN_WORDS, CAFES, MENU_WRONG, PRICE_FAULTS, PRODUCTS, QTY_WORDS, SUPPLIERS, WHOLESALE } from "./data";

export const SEED_DIR = join(import.meta.dir, "seed", "wren-street");
const KEY_PATH = join(import.meta.dir, "key.json");

// A small seeded random number generator (mulberry32), so every build is the same.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayFirst = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const wordy = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const money = (n: number) => n.toFixed(2);
const bySlug = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));

function workdays(from: string, to: string): Date[] {
  const out: Date[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d = new Date(d.getTime() + 86400000))
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d);
  return out;
}

export function build(seed = 7) {
  const rand = rng(seed);
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const files: Record<string, string | Uint8Array> = {};
  const key: any = { seed };

  // Orders: three sources merged into one export.
  type Order = { id: string; date: Date; cafe: (typeof CAFES)[number]; product: string; qty: number; source: string };
  const orders: Order[] = [];
  const days = workdays("2026-08-03", "2026-10-30");
  let n = 1001;
  for (const d of days)
    for (const cafe of CAFES)
      if (rand() < 0.4 && orders.length < 160) {
        const product = pick(WHOLESALE);
        const qty = pick([6, 10, 12, 12, 18, 24, 24, 30, 36]);
        orders.push({ id: `WS-${n++}`, date: d, cafe, product, qty, source: pick(["web", "phone", "phone", "email"]) });
      }
  // Make sure at least a few phone orders have a day of 12 or less, where day and month can swap.
  const ambiguous = orders.filter((o) => o.source === "phone" && o.date.getUTCDate() <= 12).map((o) => o.id);
  if (ambiguous.length < 5) throw new Error("not enough ambiguous phone dates; change the seed");
  const rows: (string | number)[][] = [];
  const wordRows = new Set<string>();
  const variantCount: Record<string, number> = {};
  for (const o of orders) {
    const date = o.source === "web" ? iso(o.date) : o.source === "phone" ? dayFirst(o.date) : wordy(o.date);
    const alt = o.cafe.spellings.length > 1 && rand() < 0.45;
    const cafeName = alt ? o.cafe.spellings[1 + (variantCount[o.cafe.account] = (variantCount[o.cafe.account] ?? 0) + 1) % (o.cafe.spellings.length - 1)] : o.cafe.name;
    let qty: string | number = o.qty;
    if (o.source !== "web" && QTY_WORDS[o.qty] && rand() < 0.35) { qty = QTY_WORDS[o.qty]; wordRows.add(o.id); }
    rows.push([o.id, date, cafeName, bySlug[o.product].name, qty, o.source]);
  }
  // Nine rows exported twice, exactly the same.
  const dupIdx = new Set<number>();
  while (dupIdx.size < 9) dupIdx.add(Math.floor(rand() * rows.length));
  const withDups: (string | number)[][] = [];
  const later: Record<number, (string | number)[][]> = {};
  rows.forEach((r, i) => {
    withDups.push(r, ...(later[i] ?? []));
    if (dupIdx.has(i)) (later[Math.min(i + 3 + Math.floor(rand() * 20), rows.length - 1)] ??= []).push([...r]);
  });
  files["orders/wholesale-orders.csv"] = toCsv([["order_id", "order_date", "cafe", "product", "quantity", "source"], ...withDups]);
  key.orders = {
    rowsInExport: withDups.length,
    duplicateIds: [...dupIdx].sort((a, b) => a - b).map((i) => rows[i][0]),
    ambiguousPhoneIds: ambiguous,
    quantityWordIds: [...wordRows],
    clean: orders.map((o) => ({ order_id: o.id, order_date: iso(o.date), cafe: o.cafe.name, product: bySlug[o.product].name, quantity: o.qty })),
  };

  files["customers/cafes.csv"] = toCsv([["account", "cafe", "area", "pays_within_days"], ...CAFES.map((c) => [c.account, c.name, c.area, c.payDays])]);
  key.cafes = CAFES.map((c) => c.name);

  // Price list, with three planted faults.
  const priceRows = PRODUCTS.map((p) => {
    let name = p.name, unit = "each", shop: number = p.shop, wholesale: number = p.wholesale;
    if (p.slug === PRICE_FAULTS.pence.slug) shop = PRICE_FAULTS.pence.wrongShop;
    if (p.slug === PRICE_FAULTS.typo.slug) name = PRICE_FAULTS.typo.wrongName;
    if (p.slug === PRICE_FAULTS.unit.slug) { unit = PRICE_FAULTS.unit.unit; shop = +(p.shop * 12).toFixed(2); wholesale = +(p.wholesale * 12).toFixed(2); }
    return [name, unit, shop, wholesale];
  });
  files["prices/price-list.xlsx"] = writeXlsx([["product", "unit", "shop_price", "wholesale_price"], ...priceRows], "Prices");
  key.prices = {
    clean: PRODUCTS.map((p) => ({ product: p.name, unit: "each", shop_price: p.shop, wholesale_price: p.wholesale })),
    fixed: [bySlug[PRICE_FAULTS.pence.slug].name, bySlug[PRICE_FAULTS.typo.slug].name, bySlug[PRICE_FAULTS.unit.slug].name],
    wrongName: PRICE_FAULTS.typo.wrongName,
  };

  // Purchase orders and supplier invoices.
  const poRows: (string | number)[][] = [];
  const invoices: { number: string; po: string; date: Date; supplier: (typeof SUPPLIERS)[number]; qty: number; price: number }[] = [];
  const counts: Record<string, number> = { MM: 6, FD: 6, HL: 6, KP: 5 };
  let po = 3001;
  const invDays = workdays("2026-08-03", "2026-10-30");
  const plan: { s: (typeof SUPPLIERS)[number]; i: number }[] = [];
  for (const s of SUPPLIERS) for (let i = 0; i < counts[s.code]; i++) plan.push({ s, i });
  plan.sort((a, b) => a.i - b.i || a.s.code.localeCompare(b.s.code));
  const invNum: Record<string, number> = { MM: 4410, FD: 2201, HL: 870, KP: 15020 };
  plan.forEach(({ s, i }, k) => {
    const date = invDays[Math.floor(((k + 0.5) / plan.length) * invDays.length)];
    const qty = pick(s.qty);
    const poNo = `PO-${po++}`;
    poRows.push([poNo, iso(date), s.name, s.item, qty, s.unit, money(s.price)]);
    let billQty = qty, price = s.price;
    if (s.code === "FD" && i >= 3) price = +(s.price * 1.04).toFixed(2); // butter creep, last three invoices
    if (s.code === "HL" && i === 3) billQty = qty - 60; // short delivery: billed and sent 60 fewer
    const d2 = new Date(date.getTime() + 2 * 86400000);
    invoices.push({ number: `${s.code}-${invNum[s.code]++}`, po: poNo, date: d2, supplier: s, qty: billQty, price });
  });
  // One butter invoice sent twice under a new number.
  const first = invoices.find((x) => x.supplier.code === "FD" && x.number.endsWith("2202"))!;
  const dup = { ...first, number: `FD-${invNum.FD++}`, date: new Date(first.date.getTime() + 9 * 86400000) };
  invoices.push(dup);
  files["purchase-orders/purchase-orders.csv"] = toCsv([["po_number", "order_date", "supplier", "item", "quantity", "unit", "agreed_price"], ...poRows]);
  for (const inv of invoices) {
    const total = +(inv.qty * inv.price).toFixed(2);
    files[`invoices/${inv.number}.pdf`] = textPdf([
      { text: inv.supplier.name, size: 18, bold: true },
      { text: "INVOICE", size: 14, bold: true },
      { text: `Invoice number: ${inv.number}` },
      { text: `Invoice date: ${wordy(inv.date)}` },
      { text: "Bill to: Wren Street Bakery, 14 Wren Street" },
      { text: `Your order: ${inv.po}` },
      { text: " " },
      { text: "Item                          Qty        Unit price     Total", bold: true },
      { text: `${inv.supplier.item.padEnd(30)}${String(inv.qty).padEnd(11)}GBP ${money(inv.price).padEnd(10)} GBP ${money(total)}` },
      { text: " " },
      { text: `Amount due: GBP ${money(total)}`, bold: true },
      { text: "Payment within 30 days. Thank you for your custom." },
    ]);
  }
  const fd = invoices.filter((x) => x.supplier.code === "FD" && x !== dup);
  const hl = invoices.filter((x) => x.supplier.code === "HL");
  key.invoices = {
    count: invoices.length,
    duplicatePair: [first.number, dup.number],
    priceAbovePo: fd.slice(3).map((x) => x.number),
    shortDelivery: [hl[3].number],
    clean: invoices.filter((x) => x !== dup && !fd.slice(3).includes(x) && x !== hl[3]).map((x) => x.number),
  };

  // Recipes, the bakery's allergen words, and the old labels (one is out of date).
  for (const p of PRODUCTS) {
    const changes = p.slug === "multigrain-loaf" ? "\n## Changes\n\n- The top is now rolled in sesame seeds. Customers liked the crunch.\n" : "";
    files[`recipes/${p.slug}.md`] = `# ${p.name}\n\n## Ingredients\n\n${p.ingredients.map((i) => `- ${i}`).join("\n")}\n\n## Method\n\n${p.method}\n${changes}`;
    files[`labels/${p.slug}.md`] = `# ${p.name}\n\nPrice: £${money(p.shop)}\n\nContains: ${p.labelAllergens.join(", ")}\n\nChecked by:\n`;
  }
  files["allergens/allergen-list.csv"] = toCsv([["allergen", "look_for"], ...ALLERGEN_WORDS.map((a) => [a.allergen, a.look_for])]);
  key.labels = Object.fromEntries(PRODUCTS.map((p) => [p.slug, { name: p.name, allergens: p.allergens }]));
  key.labelOutOfDate = "multigrain-loaf";

  // The menu on the shop wall.
  files["menu/menu.md"] = `# Wren Street Bakery\n\n## Bread\n\n${PRODUCTS.slice(0, 4).map((p) => `- ${p.name}: £${money(MENU_WRONG[p.slug] ?? p.shop)}`).join("\n")}\n- ${PRODUCTS[11].name}: £${money(PRODUCTS[11].shop)}\n\n## Pastries and bakes\n\n${PRODUCTS.slice(4, 11).map((p) => `- ${p.name}: £${money(MENU_WRONG[p.slug] ?? p.shop)}`).join("\n")}\n`;
  key.menuWrong = Object.fromEntries(Object.entries(MENU_WRONG).map(([s, v]) => [bySlug[s].name, { menu: v, list: bySlug[s].shop }]));

  // The till: shop sales and waste, the system of record for reports.
  const tillRows: (string | number)[][] = [];
  const totals = { sold: 0, waste: 0, takings: 0 };
  for (const d of (() => { const out: Date[] = []; for (let t = Date.UTC(2026, 9, 5); t <= Date.UTC(2026, 10, 1); t += 86400000) out.push(new Date(t)); return out; })()) {
    if (d.getUTCDay() === 1) continue; // the shop is shut one day a week
    for (const p of PRODUCTS) {
      const baked = 8 + Math.floor(rand() * 20);
      const waste = Math.floor(rand() * 4);
      const sold = baked - waste;
      tillRows.push([iso(d), p.name, baked, sold, waste, money(sold * p.shop)]);
      totals.sold += sold; totals.waste += waste; totals.takings += sold * p.shop;
    }
  }
  files["till/sales.csv"] = toCsv([["date", "product", "baked", "sold", "waste", "takings"], ...tillRows]);
  files["till/README.md"] = "# The till\n\nThe till writes `sales.csv` at closing time. One row for each product on each day the shop is open.\n\nNobody edits this file by hand. It is the record of what really sold.\n";
  key.till = { rows: tillRows.length, sold: totals.sold, waste: totals.waste, takings: +totals.takings.toFixed(2) };

  files["notes/owner-notes.md"] = `# Notes from Jess (owner)

## How we write

- Short and friendly. Sign off "Jess at Wren Street".
- Prices in pounds with two decimals, like £2.80.

## Dates

- Phone orders are written day first: 03/09/2026 is the 3rd of September.
- In any file we keep, write dates as YYYY-MM-DD.

## Cafes

- The right spelling of each cafe is in customers/cafes.csv.
- Kettle and Crumb and Moss and Grain often pay late. Check before the close.

## Never

- Never email a cafe without asking me first.
- Never change the till file or the purchase orders. They are the record.
- Never delete anything. Make a new file in out/ instead.
`;

  files["README.md"] = `# Wren Street Bakery

This is the bakery's shared folder. It is made-up data for practice.

| Folder | What is in it |
|---|---|
| orders/ | Cafe orders, exported from three places |
| customers/ | The six cafes we deliver to |
| prices/ | The price list |
| invoices/ | Supplier invoices as PDFs |
| purchase-orders/ | What we ordered from suppliers |
| recipes/ | One recipe for each product |
| allergens/ | The words we look for in recipes |
| labels/ | The labels on the shop shelf |
| menu/ | The menu on the shop wall |
| till/ | What sold, from the till |
| notes/ | Notes from Jess, the owner |
| out/ | Put new files here |
`;
  files["package.json"] = JSON.stringify({ private: true, scripts: { verify: "bun ../scripts/verify.ts" } }, null, 2) + "\n";
  files["out/.keep"] = "";

  return { files, key };
}

export function writeSeed(dir: string, files: Record<string, string | Uint8Array>) {
  rmSync(dir, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, body);
  }
}

if (import.meta.main) {
  const { files, key } = build(Number(process.argv[2] ?? 7));
  writeSeed(SEED_DIR, files);
  writeFileSync(KEY_PATH, JSON.stringify(key, null, 2) + "\n");
  console.log(`Built the seed: ${Object.keys(files).length} files, ${key.orders.clean.length} orders, ${key.invoices.count} invoices.`);
}
