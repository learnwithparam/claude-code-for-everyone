// The Friday close: clean orders, fix prices, check invoices, make labels, write report, build menu page.
// Reads originals only. Writes everything into out/.
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readXlsx, writeXlsx, type Cell } from "../../../../checks/lib/xlsx.ts";

const read = (p: string) => readFileSync(p, "utf8");
const csv = (p: string) => {
  const [head, ...rows] = read(p).trim().split(/\r?\n/);
  const keys = head.split(",");
  return rows.map((line) => Object.fromEntries(line.split(",").map((v, i) => [keys[i], v])));
};
const money = (n: number) => `£${n.toFixed(2)}`;
mkdirSync("out/labels", { recursive: true });
mkdirSync("out/reports", { recursive: true });
mkdirSync("out/site", { recursive: true });

// ---------- 2. Clean the orders ----------
const cafes = csv("customers/cafes.csv").map((c) => c.cafe);
const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
function cafeName(raw: string): string {
  const k = key(raw);
  const exact = cafes.find((c) => key(c) === k);
  if (exact) return exact;
  const starts = cafes.filter((c) => key(c).startsWith(k + " "));
  if (starts.length === 1) return starts[0];
  throw new Error(`unknown cafe: ${raw}`);
}
const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
function isoDate(raw: string): string {
  const s = raw.trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return s;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; // day first
  if ((m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/))) return `${m[3]}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  throw new Error(`unknown date: ${raw}`);
}
const words: Record<string, number> = { six: 6, ten: 10, twelve: 12, eighteen: 18, "a dozen": 12, "two dozen": 24, "three dozen": 36 };
function qty(raw: string): number {
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) return Number(s);
  if (s in words) return words[s];
  throw new Error(`unknown quantity: ${raw}`);
}
const orderLines = read("orders/wholesale-orders.csv").trim().split(/\r?\n/);
const seen = new Set<string>();
const dropped: string[] = [];
const clean: string[] = ["order_id,order_date,cafe,product,quantity"];
for (const line of orderLines.slice(1)) {
  if (seen.has(line)) { dropped.push(line); continue; }
  seen.add(line);
  const [id, date, cafe, product, q] = line.split(",");
  clean.push([id.trim(), isoDate(date), cafeName(cafe), product.trim(), qty(q)].join(","));
}
writeFileSync("out/orders-clean.csv", clean.join("\n") + "\n");
console.log(`orders: ${orderLines.length - 1} rows in, ${clean.length - 1} out, ${dropped.length} exact copies dropped`);
for (const d of dropped) console.log("  dropped:", d);

// ---------- 3. Fix the price list ----------
const recipeFiles = readdirSync("recipes").filter((f) => f.endsWith(".md")).sort();
const recipeName = (f: string) => read(`recipes/${f}`).split(/\r?\n/)[0].replace(/^#\s*/, "").trim();
const recipeNames = recipeFiles.map(recipeName);
const [head, ...priceRows] = readXlsx(new Uint8Array(readFileSync("prices/price-list.xlsx")));
const col = Object.fromEntries(head.map((h, i) => [String(h).trim().toLowerCase(), i]));
const changes: string[] = [];
const prices: { product: string; unit: string; shop: number; wholesale: number }[] = [];
const editDistance = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
for (const r of priceRows) {
  const what: string[] = [];
  let product = String(r[col.product]).trim();
  let unit = String(r[col.unit]).trim().toLowerCase();
  let shop = Number(r[col.shop_price]);
  let wholesale = Number(r[col.wholesale_price]);
  if (!recipeNames.includes(product)) {
    const best = recipeNames.map((n) => [n, editDistance(n.toLowerCase(), product.toLowerCase())] as const).sort((a, b) => a[1] - b[1])[0];
    if (best[1] > 3) throw new Error(`no recipe for ${product}`);
    what.push(`name "${product}" changed to "${best[0]}" to match the recipe`);
    product = best[0];
  }
  if (unit === "dozen") {
    const s2 = Math.round((shop / 12) * 100) / 100, w2 = Math.round((wholesale / 12) * 100) / 100;
    what.push(`priced per dozen (shop ${money(shop)}, wholesale ${money(wholesale)}); now per item: shop ${money(s2)}, wholesale ${money(w2)}`);
    shop = s2; wholesale = w2; unit = "each";
  } else if (unit !== "each") throw new Error(`unknown unit ${unit}`);
  // A shop price over £100 for one item is in pence, not pounds.
  if (shop >= 100) { what.push(`shop price written in pence (${shop}); now ${money(shop / 100)}`); shop = shop / 100; }
  if (wholesale >= 100) { what.push(`wholesale price written in pence (${wholesale}); now ${money(wholesale / 100)}`); wholesale = wholesale / 100; }
  if (what.length) changes.push(`- ${product}: ${what.join("; ")}.`);
  prices.push({ product, unit, shop, wholesale });
}
for (const n of recipeNames) if (!prices.some((p) => p.product === n)) throw new Error(`no price for ${n}`);
const rows: Cell[][] = [["product", "unit", "shop_price", "wholesale_price"], ...prices.map((p) => [p.product, p.unit, p.shop, p.wholesale])];
writeFileSync("out/price-list-clean.xlsx", writeXlsx(rows, "Prices"));
writeFileSync("out/price-changes.md", `# Price list changes\n\n${changes.join("\n")}\n`);

// ---------- 4. Check the invoices ----------
const pos = Object.fromEntries(csv("purchase-orders/purchase-orders.csv").map((p) => [p.po_number, p]));
const invFiles = readdirSync("invoices").filter((f) => f.endsWith(".pdf"));
const invoices = invFiles.map((f) => {
  const t = Bun.spawnSync(["pdftotext", "-layout", `invoices/${f}`, "-"]).stdout.toString();
  const number = t.match(/Invoice number:\s*(\S+)/)![1];
  const po = t.match(/Your order:\s*(\S+)/)![1];
  const dateRaw = t.match(/Invoice date:\s*(.+)/)![1].trim();
  const line = t.match(/^\s*([a-z][a-z ]+?)\s+(\d+)\s+GBP\s+([\d.]+)\s+GBP\s+([\d.]+)/m)!;
  return { number, po, date: isoDate(dateRaw), item: line[1].trim(), qty: Number(line[2]), price: Number(line[3]), total: Number(line[4]) };
}).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
const billed = new Map<string, string>();
const recon: string[][] = [];
for (const inv of invoices) {
  const po = pos[inv.po];
  let status = "ok", reason = "matches the purchase order";
  if (!po) { status = "no PO"; reason = `${inv.po} is not in purchase-orders.csv`; }
  else if (billed.has(inv.po)) { status = "duplicate"; reason = `${inv.po} was already billed on ${billed.get(inv.po)}`; }
  else if (inv.price > Number(po.agreed_price)) { status = "price above PO"; reason = `${inv.item} billed at £${inv.price.toFixed(2)}/${po.unit}; PO agreed £${Number(po.agreed_price).toFixed(2)} (£${((inv.price - Number(po.agreed_price)) * inv.qty).toFixed(2)} over)`; }
  else if (inv.qty < Number(po.quantity)) { status = "short delivery"; reason = `${inv.qty} ${po.unit} billed; PO ordered ${po.quantity}`; }
  else if (inv.item !== po.item || inv.qty !== Number(po.quantity) || inv.price !== Number(po.agreed_price)) { status = "mismatch"; reason = "item, quantity or price differs from the PO"; }
  if (po && !billed.has(inv.po)) billed.set(inv.po, inv.number);
  recon.push([inv.number, inv.po, status, reason]);
}
recon.sort((a, b) => a[0].localeCompare(b[0]));
const q = (s: string) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
writeFileSync("out/reconciliation.csv", ["invoice,po,status,reason", ...recon.map((r) => r.map(q).join(","))].join("\n") + "\n");
console.log("reconciliation:"); for (const r of recon) if (r[2] !== "ok") console.log("  ", r.join(" | "));

// ---------- 5. Labels ----------
const allergens = csv("allergens/allergen-list.csv").map((a) => ({ name: a.allergen.trim().toLowerCase(), words: a.look_for.split(";").map((w) => w.trim().toLowerCase()) }));
const labelInfo: Record<string, string[]> = {};
for (const f of recipeFiles) {
  const text = read(`recipes/${f}`);
  const name = recipeName(f);
  const ing = (text.match(/##\s*Ingredients\s*\n([\s\S]*?)(\n##\s|$)/i)?.[1] ?? "").toLowerCase();
  if (!ing.trim()) throw new Error(`no ingredients in ${f}`);
  const found = allergens.filter((a) => a.words.some((w) => ing.includes(w))).map((a) => a.name);
  labelInfo[name] = found;
  const price = prices.find((p) => p.product === name)!;
  writeFileSync(`out/labels/${f}`, `# ${name}\n\nPrice: ${money(price.shop)}\n\nContains: ${found.length ? found.join(", ") : "none of the listed allergens"}\n\nChecked by:\n`);
}

// ---------- 6. Monday report ----------
const sales = csv("till/sales.csv");
let takings = 0, sold = 0, waste = 0;
const wasteBy: Record<string, number> = {};
for (const s of sales) {
  takings += Math.round(Number(s.takings) * 100);
  sold += Number(s.sold); waste += Number(s.waste);
  wasteBy[s.product] = (wasteBy[s.product] ?? 0) + Number(s.waste);
}
const [topWaste, topCount] = Object.entries(wasteBy).sort((a, b) => b[1] - a[1])[0];
const dates = sales.map((s) => s.date).sort();
const notes = read("notes/owner-notes.md");
const late = cafes.filter((c) => notes.includes(c) && /pay late/i.test(notes.split("\n").find((l) => l.includes(c)) ?? ""));
const pounds = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
writeFileSync("out/reports/monday-report.md", `# Monday report

From the till, ${dates[0]} to ${dates[dates.length - 1]}: we took ${pounds(takings)} from ${sold} items sold, and wasted ${waste} items. ${topWaste} had the most waste (${topCount}), and ${late.join(" and ")} often pay late, so check them before the close.

## Sales

- Takings: ${pounds(takings)}
- Items sold: ${sold}

## Waste

- Items wasted: ${waste}
- Most waste: ${topWaste} (${topCount})

## Late payers

${late.map((c) => `- ${c}`).join("\n")}

Jess at Wren Street
`);
console.log(`report: takings ${pounds(takings)}, sold ${sold}, waste ${waste}, top waste ${topWaste} ${topCount}, rows ${sales.length}`);

// ---------- 7. Menu page ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const items = prices.map((p) => `      <li><span class="name">${esc(p.product)}</span><span class="price">${money(p.shop)}</span><span class="allergens">Contains: ${esc(labelInfo[p.product].join(", ") || "none of the listed allergens")}</span></li>`).join("\n");
writeFileSync("out/site/index.html", `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wren Street Bakery menu</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #fdf8f1; color: #2b2118; line-height: 1.4; }
    main { max-width: 36rem; margin: 0 auto; }
    h1 { font-size: 1.6rem; margin: 0.5rem 0 1rem; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { display: grid; grid-template-columns: 1fr auto; gap: 0.2rem 1rem; padding: 0.8rem 0; border-bottom: 1px solid #e6dccd; }
    .name { font-weight: 600; font-size: 1.1rem; }
    .price { font-weight: 600; font-size: 1.1rem; text-align: right; }
    .allergens { grid-column: 1 / -1; font-size: 0.95rem; color: #5a4a3a; }
    footer { margin-top: 1.5rem; font-size: 0.9rem; color: #5a4a3a; }
  </style>
</head>
<body>
  <main>
    <h1>Wren Street Bakery</h1>
    <ul>
${items}
    </ul>
    <footer>Please ask us about allergens before you buy. Jess at Wren Street</footer>
  </main>
</body>
</html>
`);
console.log("done");
