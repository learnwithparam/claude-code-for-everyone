// Friday close for Wren Street Bakery. Reads originals, writes only into out/.
// Run from the bakery folder: bun out/scripts/friday-close.ts
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readXlsx, writeXlsx } from "../../../../checks/lib/xlsx.ts";

const read = (p: string) => readFileSync(p, "utf8");
const csv = (p: string) =>
  read(p).trim().split("\n").map((l) => l.replace(/\r$/, "").split(","));
const money = (n: number) => `£${n.toFixed(2)}`;
for (const d of ["out", "out/labels", "out/reports", "out/site"]) mkdirSync(d, { recursive: true });

// ---------- Step 2: clean the orders ----------
const cafes = csv("customers/cafes.csv").slice(1).map((r) => r[1]);
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
function cafeName(raw: string): string {
  const n = norm(raw);
  const hit = cafes.find((c) => norm(c) === n) ?? cafes.find((c) => norm(c).startsWith(n + " "));
  if (!hit) throw new Error(`Unknown cafe: ${raw}`);
  return hit;
}
const months: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
function isoDate(raw: string): string {
  let m;
  if ((m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return raw;
  if ((m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) // day first
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if ((m = raw.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/)))
    return `${m[3]}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  throw new Error(`Unknown date: ${raw}`);
}
const words: Record<string, number> = {
  six: 6, ten: 10, twelve: 12, eighteen: 18, "a dozen": 12, "two dozen": 24, "three dozen": 36,
};
function qty(raw: string): number {
  const t = raw.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (t in words) return words[t];
  throw new Error(`Unknown quantity: ${raw}`);
}
const orderLines = read("orders/wholesale-orders.csv").trim().split("\n").map((l) => l.replace(/\r$/, ""));
const seen = new Set<string>();
const clean: string[] = ["order_id,order_date,cafe,product,quantity"];
let dropped: string[] = [];
for (const line of orderLines.slice(1)) {
  if (seen.has(line)) { dropped.push(line.split(",")[0]); continue; } // exact copy only
  seen.add(line);
  const [id, date, cafe, product, q] = line.split(",");
  clean.push([id, isoDate(date), cafeName(cafe), product.trim(), qty(q)].join(","));
}
writeFileSync("out/orders-clean.csv", clean.join("\n") + "\n");
console.log(`orders: ${orderLines.length - 1} in, ${clean.length - 1} out, dropped exact copies: ${dropped.join(" ")}`);

// ---------- Step 3: fix the price list ----------
const recipeFiles = readdirSync("recipes").filter((f) => f.endsWith(".md")).sort();
const recipeName = (f: string) => read(`recipes/${f}`).split("\n")[0].replace(/^#\s*/, "").trim();
const recipeNames = recipeFiles.map(recipeName);
const rows = (await readXlsx(new Uint8Array(readFileSync("prices/price-list.xlsx")))) as any[][];
const loose = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").split("").sort().join("");
const changes: string[] = [];
const priceRows: [string, string, number, number][] = [];
for (const [product, unit, shop, whole] of rows.slice(1)) {
  const notes: string[] = [];
  let name = String(product).trim();
  if (!recipeNames.includes(name)) {
    const fix = recipeNames.find((r) => loose(r) === loose(name)); // same letters, wrong order
    if (!fix) throw new Error(`No recipe for ${name}`);
    notes.push(`name "${name}" changed to "${fix}" to match the recipe`);
    name = fix;
  }
  let s = Number(shop), w = Number(whole), u = String(unit).trim();
  if (u === "dozen") {
    notes.push(`priced per dozen (${money(s)} shop, ${money(w)} wholesale); now per item: ${money(s / 12)} shop, ${money(w / 12)} wholesale`);
    s = s / 12; w = w / 12; u = "each";
  }
  if (s >= 100) { notes.push(`shop price ${s} was in pence; now ${money(s / 100)}`); s = s / 100; }
  if (w >= 100) { notes.push(`wholesale price ${w} was in pence; now ${money(w / 100)}`); w = w / 100; }
  s = Math.round(s * 100) / 100; w = Math.round(w * 100) / 100;
  priceRows.push([name, u, s, w]);
  if (notes.length) changes.push(`- ${name}: ${notes.join("; ")}.`);
}
const xlsxBytes = await (writeXlsx as any)([["product", "unit", "shop_price", "wholesale_price"], ...priceRows]);
writeFileSync("out/price-list-clean.xlsx", xlsxBytes);
// Read it back to be sure it opens and holds the right rows.
console.log("xlsx check:", JSON.stringify(await readXlsx(new Uint8Array(readFileSync("out/price-list-clean.xlsx")))));
writeFileSync("out/price-changes.md", `# Price list changes\n\n${changes.join("\n")}\n`);
const shopPrice = new Map(priceRows.map((r) => [r[0], r[2]]));

// ---------- Step 4: check the invoices ----------
const pos = new Map(csv("purchase-orders/purchase-orders.csv").slice(1).map((r) => [r[0], r]));
const recon: string[] = ["invoice,po,status,reason"];
const poSeen = new Map<string, string>();
const invFiles = readdirSync("invoices").filter((f) => f.endsWith(".pdf"));
const invs = invFiles.map((f) => {
  const t = Bun.spawnSync(["pdftotext", "-layout", `invoices/${f}`, "-"]).stdout.toString();
  const g = (re: RegExp) => (t.match(re) ?? [])[1];
  const line = t.match(/\n(\D+?)\s+(\d+)\s+GBP ([\d.]+)\s+GBP ([\d.]+)/)!;
  return {
    inv: g(/Invoice number: (\S+)/)!, po: g(/Your order: (\S+)/)!,
    date: isoDate(g(/Invoice date: (.+)/)!.trim()),
    qty: Number(line[2]), price: Number(line[3]), total: Number(line[4]),
  };
}).sort((a, b) => a.date.localeCompare(b.date) || a.inv.localeCompare(b.inv));
const flags: string[] = [];
for (const v of invs) {
  const po = pos.get(v.po);
  let status = "ok", reason = "matches the PO";
  if (!po) { status = "short delivery"; reason = `PO ${v.po} not found`; }
  else if (poSeen.has(v.po)) { status = "duplicate"; reason = `${v.po} already billed on ${poSeen.get(v.po)}; ${money(v.total)} would be paid twice`; }
  else if (v.price > Number(po[6])) {
    status = "price above PO";
    reason = `${money(v.price)} per ${po[5]} billed; PO agreed ${money(Number(po[6]))}; overcharge ${money((v.price - Number(po[6])) * v.qty)}`;
  } else if (v.qty < Number(po[4])) {
    status = "short delivery";
    reason = `${v.qty} ${po[5]}s billed; PO ordered ${po[4]}; ${Number(po[4]) - v.qty} short`;
  }
  if (po && !poSeen.has(v.po)) poSeen.set(v.po, v.inv);
  recon.push([v.inv, v.po, status, `"${reason}"`].join(","));
  if (status !== "ok") flags.push(`${v.inv},${v.po},${status},${reason}`);
}
writeFileSync("out/reconciliation.csv", recon.join("\n") + "\n");
const billed = new Set(invs.map((v) => v.po));
const unbilled = [...pos.keys()].filter((p) => !billed.has(p));
console.log("invoice flags:\n" + flags.join("\n"));
console.log("POs with no invoice:", unbilled.join(" ") || "none");

// ---------- Step 5: labels ----------
const allergens = csv("allergens/allergen-list.csv").slice(1).map(([a, l]) => ({
  name: a, look: l.split(";").map((s) => s.trim().toLowerCase()),
}));
const labelAllergens = new Map<string, string[]>();
for (const f of recipeFiles) {
  const text = read(`recipes/${f}`);
  const name = recipeName(f);
  const ingr = (text.split(/^## Ingredients\s*$/m)[1] ?? "").split(/^## /m)[0].toLowerCase();
  const has = allergens.filter((a) => a.look.some((w) => new RegExp(`\\b${w}\\b`).test(ingr))).map((a) => a.name);
  const price = shopPrice.get(name);
  if (price === undefined) throw new Error(`No price for ${name}`);
  labelAllergens.set(name, has);
  writeFileSync(`out/labels/${f}`, `# ${name}\n\nPrice: ${money(price)}\n\nContains: ${has.join(", ")}\n\nChecked by:\n`);
}

// ---------- Step 6: Monday report ----------
const sales = csv("till/sales.csv");
const h = sales[0];
const col = (n: string) => h.indexOf(n);
let pence = 0, sold = 0, waste = 0;
const wasteBy = new Map<string, number>();
for (const r of sales.slice(1)) {
  pence += Math.round(Number(r[col("takings")]) * 100);
  sold += Number(r[col("sold")]);
  const w = Number(r[col("waste")]);
  waste += w;
  wasteBy.set(r[col("product")], (wasteBy.get(r[col("product")]) ?? 0) + w);
}
const [topWaste, topCount] = [...wasteBy].sort((a, b) => b[1] - a[1])[0];
const dates = sales.slice(1).map((r) => r[col("date")]).sort();
const notes = read("notes/owner-notes.md");
const late = cafes.filter((c) => new RegExp(`${c}[^.]*pay late|${c} and [^.]*pay late|and ${c} often pay late`).test(notes));
const takings = money(pence / 100);
writeFileSync("out/reports/monday-report.md", `# Monday report

The till took ${takings} from ${sold} items sold between ${dates[0]} and ${dates.at(-1)}. We wasted ${waste} items, most of them ${topWaste} (${topCount}).

## Sales

- Takings: ${takings}
- Items sold: ${sold}

## Waste

- Items wasted: ${waste}
- Most waste: ${topWaste}, ${topCount} items

## Late payers

${late.map((c) => `- ${c}`).join("\n")}

Jess at Wren Street
`);
console.log(`report: takings ${takings}, sold ${sold}, waste ${waste}, top ${topWaste} ${topCount}, late ${late.join(" / ")}`);

// ---------- Step 7: menu page ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const items = priceRows.map(([name, , s]) => {
  const a = labelAllergens.get(name)!;
  return `      <li><span class="name">${esc(name)}</span><span class="price">${money(s)}</span>
        <span class="allergens">Contains: ${a.length ? a.join(", ") : "none of our listed allergens"}</span></li>`;
}).join("\n");
writeFileSync("out/site/index.html", `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wren Street Bakery menu</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 36rem; padding: 1rem; line-height: 1.4; color: #222; }
    h1 { font-size: 1.6rem; margin-bottom: .25rem; }
    ul { list-style: none; padding: 0; }
    li { display: flex; flex-wrap: wrap; justify-content: space-between; border-bottom: 1px solid #ddd; padding: .75rem 0; }
    .name { font-weight: 600; }
    .price { font-weight: 600; }
    .allergens { flex-basis: 100%; font-size: .9rem; color: #555; }
    footer { font-size: .85rem; color: #555; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Wren Street Bakery</h1>
  <p>Shop prices, one item each. Ask us if you have an allergy.</p>
  <ul>
${items}
  </ul>
  <footer>Jess at Wren Street</footer>
</body>
</html>
`);
console.log("done");
