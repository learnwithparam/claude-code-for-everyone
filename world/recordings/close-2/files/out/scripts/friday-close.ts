// The Friday close for Wren Street Bakery. Reads the originals, writes only into out/.
// Run from the bakery folder: bun out/scripts/friday-close.ts
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readXlsx, writeXlsx, type Cell } from "../../../../checks/lib/xlsx.ts";

const read = (p: string) => readFileSync(p, "utf8");
const csvRows = (p: string) => read(p).trim().split(/\r?\n/).map((l) => l.split(","));
const csvField = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map((c) => csvField(String(c))).join(",")).join("\n") + "\n";
const money = (n: number) => `£${n.toFixed(2)}`;
mkdirSync("out/labels", { recursive: true });
mkdirSync("out/reports", { recursive: true });
mkdirSync("out/site", { recursive: true });

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
function isoDate(s: string): string {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // phone orders: day first
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  throw new Error(`unknown date: ${s}`);
}

// ---------- 2. Clean the orders ----------
const cafes = csvRows("customers/cafes.csv").slice(1).map((r) => r[1]);
const cafeKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
function cafeName(raw: string): string {
  const k = cafeKey(raw);
  const exact = cafes.find((c) => cafeKey(c) === k);
  if (exact) return exact;
  const starts = cafes.filter((c) => cafeKey(c).startsWith(k + " "));
  if (starts.length === 1) return starts[0];
  throw new Error(`unknown cafe: ${raw}`);
}
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, eighteen: 18, twenty: 20, thirty: 30 };
function qty(raw: string): number {
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^(a|\w+) dozen$/);
  if (m) { const n = m[1] === "a" ? 1 : WORDS[m[1]]; if (n) return n * 12; }
  if (WORDS[s]) return WORDS[s];
  throw new Error(`unknown quantity: ${raw}`);
}
const orderLines = read("orders/wholesale-orders.csv").trim().split(/\r?\n/);
const seen = new Set<string>();
const dropped: string[] = [];
const orders: (string | number)[][] = [["order_id", "order_date", "cafe", "product", "quantity"]];
for (const line of orderLines.slice(1)) {
  if (seen.has(line)) { dropped.push(line.split(",")[0]); continue; }
  seen.add(line);
  const [id, date, cafe, product, q] = line.split(",");
  orders.push([id.trim(), isoDate(date), cafeName(cafe), product.trim(), qty(q)]);
}
writeFileSync("out/orders-clean.csv", toCsv(orders));
console.log(`orders: ${orderLines.length - 1} in, ${orders.length - 1} out, dropped exact copies: ${dropped.join(" ")}`);

// ---------- 3. Fix the price list ----------
const recipeFiles = readdirSync("recipes").filter((f) => f.endsWith(".md")).sort();
const recipeName = (f: string) => read(`recipes/${f}`).split(/\r?\n/)[0].replace(/^#\s*/, "").trim();
const recipeNames = recipeFiles.map(recipeName);
const lev = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const [head, ...priceRows] = readXlsx(new Uint8Array(readFileSync("prices/price-list.xlsx")));
const hi = (n: string) => head.findIndex((h) => String(h).trim().toLowerCase() === n);
const changes: string[] = [];
const clean: { product: string; unit: string; shop: number; wholesale: number }[] = [];
for (const r of priceRows) {
  const raw = String(r[hi("product")]).trim();
  let product = recipeNames.find((n) => n.toLowerCase() === raw.toLowerCase());
  if (!product) { product = [...recipeNames].sort((a, b) => lev(a.toLowerCase(), raw.toLowerCase()) - lev(b.toLowerCase(), raw.toLowerCase()))[0]; }
  const unit = String(r[hi("unit")]).trim().toLowerCase();
  let shop = Number(r[hi("shop_price")]), wholesale = Number(r[hi("wholesale_price")]);
  const notes: string[] = [];
  if (product !== raw) notes.push(`name "${raw}" changed to "${product}" to match the recipe`);
  if (unit === "dozen") {
    const s2 = Math.round((shop / 12) * 100) / 100, w2 = Math.round((wholesale / 12) * 100) / 100;
    notes.push(`priced per dozen (shop ${money(shop)}, wholesale ${money(wholesale)}); now per item: shop ${money(s2)}, wholesale ${money(w2)}`);
    shop = s2; wholesale = w2;
  } else if (unit !== "each") throw new Error(`unknown unit ${unit}`);
  if (shop >= 100) { notes.push(`shop price ${shop} was in pence; now ${money(shop / 100)}`); shop = shop / 100; }
  if (wholesale >= 100) { notes.push(`wholesale price ${wholesale} was in pence; now ${money(wholesale / 100)}`); wholesale = wholesale / 100; }
  if (notes.length) changes.push(`- ${product}: ${notes.join("; ")}.`);
  clean.push({ product, unit: "each", shop, wholesale });
}
const missing = recipeNames.filter((n) => !clean.some((c) => c.product === n));
if (missing.length) console.log(`recipes with no price: ${missing.join(", ")}`);
const xrows: Cell[][] = [["product", "unit", "shop_price", "wholesale_price"], ...clean.map((c) => [c.product, c.unit, c.shop, c.wholesale])];
writeFileSync("out/price-list-clean.xlsx", writeXlsx(xrows, "Prices"));
writeFileSync("out/price-changes.md", `# Price list changes\n\n${changes.join("\n")}\n`);
console.log(changes.join("\n"));

// ---------- 4. Check the invoices ----------
const poRows = csvRows("purchase-orders/purchase-orders.csv");
const poH = poRows[0];
const pos = new Map(poRows.slice(1).map((r) => [r[0], Object.fromEntries(poH.map((h, i) => [h, r[i]]))]));
const invoices = readdirSync("invoices").filter((f) => f.endsWith(".pdf")).map((f) => {
  const text = Bun.spawnSync(["pdftotext", "-layout", `invoices/${f}`, "-"]).stdout.toString();
  const num = text.match(/Invoice number:\s*(\S+)/)![1];
  const date = isoDate(text.match(/Invoice date:\s*(.+)/)![1]);
  const po = text.match(/Your order:\s*(\S+)/)![1];
  const line = text.match(/^([a-z][a-z ]+?)\s{2,}(\d+)\s+GBP\s+([\d.]+)\s+GBP\s+([\d.]+)\s*$/m)!;
  return { num, date, po, item: line[1].trim(), qty: Number(line[2]), price: Number(line[3]), total: Number(line[4]) };
}).sort((a, b) => a.date.localeCompare(b.date) || a.num.localeCompare(b.num));
const billed = new Map<string, string>();
const recon: string[][] = [["invoice", "po", "status", "reason"]];
const reconOut: { num: string; po: string; status: string; reason: string }[] = [];
for (const inv of invoices) {
  const po = pos.get(inv.po);
  let status = "ok", reason = "";
  if (!po) { status = "no PO"; reason = `${inv.po} is not in purchase-orders.csv`; }
  else if (billed.has(inv.po)) { status = "duplicate"; reason = `${inv.po} was already billed by ${billed.get(inv.po)}; this bills it again for ${money(inv.total)}`; }
  else if (inv.price > Number(po.agreed_price)) { status = "price above PO"; reason = `${inv.item} billed at ${money(inv.price)} a ${po.unit}, PO agreed ${money(Number(po.agreed_price))}; ${money(inv.total)} billed vs ${money(inv.qty * Number(po.agreed_price))} at PO price`; }
  else if (inv.qty < Number(po.quantity)) { status = "short delivery"; reason = `${inv.qty} ${inv.item} billed, PO ordered ${po.quantity}`; }
  if (po && !billed.has(inv.po)) billed.set(inv.po, inv.num);
  reconOut.push({ num: inv.num, po: inv.po, status, reason });
}
reconOut.sort((a, b) => a.num.localeCompare(b.num));
for (const r of reconOut) recon.push([r.num, r.po, r.status, r.reason]);
writeFileSync("out/reconciliation.csv", toCsv(recon));
const unbilled = [...pos.keys()].filter((p) => !billed.has(p));
console.log(reconOut.filter((r) => r.status !== "ok"));
console.log(`POs with no invoice: ${unbilled.join(", ") || "none"}`);

// ---------- 5. Labels ----------
const allergens = csvRows("allergens/allergen-list.csv").slice(1).map((r) => ({ name: r[0], words: r.slice(1).join(",").split(";").map((w) => w.trim().toLowerCase()) }));
const labelInfo = new Map<string, string[]>();
for (const f of recipeFiles) {
  const text = read(`recipes/${f}`);
  const ingredients = (text.match(/## Ingredients\s*\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? "").toLowerCase();
  const name = recipeName(f);
  const found = allergens.filter((a) => a.words.some((w) => new RegExp(`\\b${w}\\b`).test(ingredients))).map((a) => a.name.toLowerCase());
  const price = clean.find((c) => c.product === name);
  if (!price) throw new Error(`no price for ${name}`);
  labelInfo.set(name, found);
  writeFileSync(`out/labels/${f}`, `# ${name}\n\nPrice: ${money(price.shop)}\n\nContains: ${found.join(", ") || "none"}\n\nChecked by:\n`);
  const old = read(`labels/${f}`);
  const oldContains = old.match(/Contains:\s*(.*)/)?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const oldPrice = old.match(/Price:\s*(.*)/)?.[1].trim();
  const added = found.filter((a) => !oldContains.includes(a));
  if (added.length || oldPrice !== money(price.shop)) console.log(`label ${f}: added ${added.join(", ") || "-"}; price ${oldPrice} -> ${money(price.shop)}`);
}

// ---------- 6. Monday report numbers ----------
const sales = csvRows("till/sales.csv");
const sh = sales[0];
const col = (n: string) => sh.indexOf(n);
let pence = 0, sold = 0, waste = 0;
const wasteBy = new Map<string, number>();
const dates = new Set<string>();
for (const r of sales.slice(1)) {
  pence += Math.round(Number(r[col("takings")]) * 100);
  sold += Number(r[col("sold")]);
  waste += Number(r[col("waste")]);
  wasteBy.set(r[col("product")], (wasteBy.get(r[col("product")]) ?? 0) + Number(r[col("waste")]));
  dates.add(r[col("date")]);
}
const [topWaste, topWasteN] = [...wasteBy].sort((a, b) => b[1] - a[1])[0];
const dl = [...dates].sort();
const notes = read("notes/owner-notes.md");
const late = cafes.filter((c) => notes.includes(c) && /pay late/i.test(notes.split("\n").find((l) => l.includes(c)) ?? ""));
const takings = money(pence / 100);
writeFileSync("out/reports/monday-report.md", `# Monday report

The till shows ${takings} taken and ${sold} items sold from ${dl[0]} to ${dl[dl.length - 1]}. We wasted ${waste} items, and ${topWaste} was the most wasted product (${topWasteN}).

## Sales

- Takings: ${takings}
- Items sold: ${sold}

## Waste

- Items wasted: ${waste}
- Most waste: ${topWaste}, ${topWasteN} items

## Late payers

${late.map((c) => `- ${c}`).join("\n")}

Jess at Wren Street
`);
console.log(`till ${dl[0]}..${dl[dl.length - 1]} (${sales.length - 1} rows): takings ${takings}, sold ${sold}, waste ${waste}, top waste ${topWaste} ${topWasteN}; late: ${late.join(", ")}`);

// ---------- 7. Menu page ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const items = clean.map((c) => {
  const file = recipeFiles.find((f) => recipeName(f) === c.product)!;
  const contains = read(`out/labels/${file}`).match(/Contains:\s*(.*)/)![1];
  return `    <li><div class="row"><span class="name">${esc(c.product)}</span><span class="price">${money(c.shop)}</span></div><div class="allergens">Contains: ${esc(contains)}</div></li>`;
}).join("\n");
writeFileSync("out/site/index.html", `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wren Street Bakery menu</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #fdfaf5; color: #2b2118; line-height: 1.4; }
  main { max-width: 36rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  p.note { margin: 0 0 1rem; color: #5c4a3a; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: .75rem 0; border-bottom: 1px solid #e6dccf; }
  .row { display: flex; justify-content: space-between; gap: 1rem; font-size: 1.1rem; }
  .name { font-weight: 600; }
  .price { white-space: nowrap; }
  .allergens { font-size: .95rem; color: #5c4a3a; margin-top: .2rem; }
</style>
</head>
<body>
<main>
  <h1>Wren Street Bakery</h1>
  <p class="note">Shop prices. Allergens come from our recipes. Please ask us if you have an allergy.</p>
  <ul>
${items}
  </ul>
</main>
</body>
</html>
`);
console.log("waste by product:", [...wasteBy].sort((a, b) => b[1] - a[1]).slice(0, 3));
console.log("done");
