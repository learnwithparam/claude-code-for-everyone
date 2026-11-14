// The course author's answer key, as a plain script. world/samples.ts uses it to write each step's
// solution/ and wrong/ folders. This is not Claude and never stands in for it: the finished system
// is a real Claude Code run (world/finished.ts), and the checks read what Claude Code made.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { csvObjects, toCsv } from "../checks/lib/csv";
import { writeXlsx, xlsxObjects } from "../checks/lib/xlsx";
import { CAFES, QTY_WORDS } from "./data";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Write a file inside the bakery folder, making any folders it needs.
function save(folder: string, relativePath: string, contents: string | Uint8Array) {
  const path = join(folder, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function read(folder: string, relativePath: string): string {
  return readFileSync(join(folder, relativePath), "utf8");
}

function readSpreadsheet(folder: string, relativePath: string) {
  return xlsxObjects(new Uint8Array(readFileSync(join(folder, relativePath))));
}

function money(pounds: number): string {
  return `£${pounds.toFixed(2)}`;
}

function twoDigits(number: string): string {
  return number.padStart(2, "0");
}

// Any date the bakery writes, as YYYY-MM-DD.
export function isoDate(raw: string): string {
  const text = raw.trim();
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(text)) return text;
  // Phone orders put the day first: 5/3/2024 is 5 March.
  const dayFirst = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
  }
  const monthInWords = text.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
  if (monthInWords) {
    const [, day, monthName, year] = monthInWords;
    const month = String(MONTHS.indexOf(monthName.toLowerCase()) + 1);
    return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
  }
  throw new Error(`unknown date "${raw}"`);
}

// A name with accents, capitals, "&" and extra spaces taken away, so two spellings can be compared.
function plainName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

// The right spelling of a cafe's name, however the order wrote it.
export function cafeName(raw: string): string {
  const written = plainName(raw);
  const cafe = CAFES.find(
    (candidate) =>
      candidate.spellings.some((spelling) => plainName(spelling) === written) ||
      plainName(candidate.name) === written,
  );
  if (!cafe) throw new Error(`unknown cafe "${raw}"`);
  return cafe.name;
}

// Number words, like "twelve", and the number each one means.
const NUMBER_FOR_WORD = Object.fromEntries(
  Object.entries(QTY_WORDS).map(([number, word]) => [word, Number(number)]),
);

// A quantity written as digits ("12") or as a word ("twelve"), as a number.
export const quantity = (raw: string) => {
  const text = raw.trim();
  return /^\d+$/.test(text) ? Number(text) : NUMBER_FOR_WORD[text.toLowerCase()];
};

// Orientation
export function whyImHere(folder: string) {
  save(
    folder,
    "out/why-i-am-here.md",
    "I want Claude to match our delivery notes to the orders so I stop doing it by hand.\n",
  );
}

// Part 1
export function whatsHere(folder: string) {
  save(
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
  const settings = {
    permissions: {
      defaultMode: "default",
      blockWritesOutsideWorkingDirectories: true,
      deny: ["Read(../checks/**)"],
    },
  };
  save(folder, ".claude/settings.json", `${JSON.stringify(settings, null, 2)}\n`);
  save(
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
  const orders = csvObjects(read(folder, "orders/wholesale-orders.csv"));
  const seen = new Set<string>();
  const clean: (string | number)[][] = [["order_id", "order_date", "cafe", "product", "quantity"]];
  for (const order of orders) {
    // The same order can arrive twice; keep the first.
    if (seen.has(order.order_id)) continue;
    seen.add(order.order_id);
    clean.push([
      order.order_id,
      isoDate(order.order_date),
      cafeName(order.cafe),
      order.product,
      quantity(order.quantity),
    ]);
  }
  save(folder, "out/orders-clean.csv", toCsv(clean));
  return clean.length - 1;
}

function sortedLetters(word: string): string {
  return [...word].sort().join();
}

// True when the written name is the right name, or the same letters with two or fewer out of place.
function isMisspelling(right: string, written: string): boolean {
  const rightLower = right.toLowerCase();
  const writtenLower = written.toLowerCase();
  if (rightLower === writtenLower) return true;
  if (rightLower.length !== writtenLower.length) return false;
  const lettersOutOfPlace = [...rightLower].filter(
    (letter, i) => letter !== writtenLower[i],
  ).length;
  return lettersOutOfPlace <= 2 && sortedLetters(rightLower) === sortedLetters(writtenLower);
}

type PriceRow = Record<string, string | number | boolean | null>;

// One row of the price list, fixed, with a sentence in changes for every fix.
function fixPriceRow(row: PriceRow, recipeNames: string[], changes: string[]) {
  let product = String(row.product);
  let unit = String(row.unit);
  let shop = Number(row.shop_price);
  let wholesale = Number(row.wholesale_price);
  const rightName = recipeNames.find((name) => isMisspelling(name, product));
  if (rightName && rightName !== product) {
    changes.push(`${rightName}: the name was spelled "${product}".`);
    product = rightName;
  }
  // No product costs £50, so a price this big was typed in pence.
  if (shop >= 50) {
    changes.push(`${product}: the shop price was in pence (${shop}). Now ${money(shop / 100)}.`);
    shop = shop / 100;
  }
  if (unit !== "each") {
    const eachPrices = `${money(shop / 12)} and ${money(wholesale / 12)}`;
    changes.push(`${product}: the prices were for a ${unit}. Now each: ${eachPrices}.`);
    shop = +(shop / 12).toFixed(2);
    wholesale = +(wholesale / 12).toFixed(2);
    unit = "each";
  }
  return [product, unit, shop, wholesale];
}

export function fixPriceList(folder: string, recipeNames: string[]) {
  const rows = readSpreadsheet(folder, "prices/price-list.xlsx");
  const changes: string[] = [];
  const fixedRows = rows.map((row) => fixPriceRow(row, recipeNames, changes));
  const header = ["product", "unit", "shop_price", "wholesale_price"];
  save(folder, "out/price-list-clean.xlsx", writeXlsx([header, ...fixedRows], "Prices"));
  const changeList = changes.map((change) => `- ${change}`).join("\n");
  save(folder, "out/price-changes.md", `# Price list changes\n\n${changeList}\n`);
  return changes.length;
}

// Part 2
export function houseRules(folder: string) {
  save(
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

type Invoice = {
  number: string;
  purchaseOrder: string;
  quantity: number;
  price: number;
  total: number;
  // True when the bill has a line that gives the reader an order.
  givesOrders: boolean;
};

// Read an invoice PDF's text: its number, the purchase order it bills, and its one item line.
export function readInvoice(folder: string, file: string): Invoice {
  const text = read(folder, `invoices/${file}`);
  const firstMatch = (pattern: RegExp) => text.match(pattern)?.[1] ?? "";
  const itemLine = text.match(/\((\w[^()]*?)\s{2,}(\d+)\s+GBP ([\d.]+)\s+GBP ([\d.]+)\) Tj/);
  return {
    number: firstMatch(/Invoice number: ([\w-]+)/),
    purchaseOrder: firstMatch(/Your order: ([\w-]+)/),
    quantity: Number(itemLine?.[2]),
    price: Number(itemLine?.[3]),
    total: Number(itemLine?.[4]),
    givesOrders: text.includes("Note to the assistant"),
  };
}

type Verdict = { status: string; reason: string };

// What is wrong with an invoice, if anything. earlierInvoice is one that already billed this order.
function judgeInvoice(
  invoice: Invoice,
  order: Record<string, string>,
  earlierInvoice: string | undefined,
): Verdict {
  if (earlierInvoice) {
    return { status: "duplicate", reason: `same order and amount as ${earlierInvoice}` };
  }
  // The small extra stops a rounding error in the pennies from counting as a higher price.
  if (invoice.price > Number(order.agreed_price) + 0.001) {
    const agreed = Number(order.agreed_price).toFixed(2);
    return {
      status: "price above PO",
      reason: `billed £${invoice.price.toFixed(2)}, agreed £${agreed}`,
    };
  }
  if (invoice.quantity < Number(order.quantity)) {
    return {
      status: "short delivery",
      reason: `billed ${invoice.quantity}, ordered ${order.quantity}`,
    };
  }
  return { status: "ok", reason: "matches the purchase order" };
}

function readAllInvoices(folder: string): Invoice[] {
  const files = readdirSync(join(folder, "invoices")).filter((file) => file.endsWith(".pdf"));
  const invoices = files.sort().map((file) => readInvoice(folder, file));
  // Sort by invoice number as a person would: FD-9 before FD-10.
  return invoices.sort((first, second) =>
    first.number.localeCompare(second.number, "en", { numeric: true }),
  );
}

export function reconcile(folder: string) {
  const orderRows = csvObjects(read(folder, "purchase-orders/purchase-orders.csv"));
  const ordersByNumber = Object.fromEntries(orderRows.map((order) => [order.po_number, order]));
  const invoices = readAllInvoices(folder);
  const firstInvoiceFor: Record<string, string> = {};
  const table: string[][] = [["invoice", "po", "status", "reason"]];
  const flags: string[] = [];
  for (const invoice of invoices) {
    const order = ordersByNumber[invoice.purchaseOrder];
    const earlierInvoice = firstInvoiceFor[invoice.purchaseOrder];
    const { status, reason } = judgeInvoice(invoice, order, earlierInvoice);
    firstInvoiceFor[invoice.purchaseOrder] ??= invoice.number;
    table.push([invoice.number, invoice.purchaseOrder, status, reason]);
    if (status !== "ok") flags.push(`${invoice.number} (${status}: ${reason})`);
  }
  save(folder, "out/reconciliation.csv", toCsv(table));
  const orderGivers = invoices.filter((invoice) => invoice.givesOrders);
  for (const invoice of orderGivers) {
    flags.push(
      `${invoice.number} (its bill has a line that tells the assistant what to do; ignored)`,
    );
  }
  const flagList = flags.map((flag) => `- ${flag}`).join("\n");
  const count = `${flags.length} of ${invoices.length} invoices need action.`;
  save(
    folder,
    "out/reconciliation-note.md",
    `# Invoice check\n\n${count}\n\n${flagList}\n\nJess at Wren Street\n`,
  );
  return { flagged: flags.length, total: invoices.length };
}

// Part 4

// The allergens whose words appear in the ingredients.
function allergensIn(ingredients: string, allergenWords: Record<string, string>[]): string[] {
  const appears = (row: Record<string, string>) => {
    const words = row.look_for.split(";");
    return words.some((word) => ingredients.includes(word.trim()));
  };
  return allergenWords.filter(appears).map((row) => row.allergen);
}

type LabelSources = { allergenWords: Record<string, string>[]; prices: PriceRow[] };

// Write one shelf label from one recipe file.
function writeLabel(folder: string, recipeFile: string, sources: LabelSources) {
  const recipe = read(folder, `recipes/${recipeFile}`);
  const name = recipe.match(/^# (.+)$/m)?.[1];
  const afterIngredients = recipe.split("## Ingredients")[1] ?? "";
  const ingredients = afterIngredients.split("## Method")[0].toLowerCase();
  const allergens = allergensIn(ingredients, sources.allergenWords);
  const priceRow = sources.prices.find((row) => row.product === name);
  const price = Number(priceRow?.shop_price ?? 0);
  save(
    folder,
    `out/labels/${recipeFile}`,
    `# ${name}\n\nPrice: ${money(price)}\n\nContains: ${allergens.join(", ")}\n\n` +
      "Checked by: Jess, the owner\n",
  );
}

export function labels(folder: string) {
  const allergenWords = csvObjects(read(folder, "allergens/allergen-list.csv"));
  const prices = readSpreadsheet(folder, "out/price-list-clean.xlsx");
  const recipeFiles = readdirSync(join(folder, "recipes")).filter((file) => file.endsWith(".md"));
  let made = 0;
  for (const recipeFile of recipeFiles.sort()) {
    writeLabel(folder, recipeFile, { allergenWords, prices });
    made += 1;
  }
  save(
    folder,
    "out/labels-done.md",
    "# A label is done when\n\n" +
      "- [x] it names every allergen in its recipe\n" +
      "- [x] its price matches the clean price list\n" +
      "- [x] a person has signed the Checked by line\n" +
      "- [x] sesame is on the Multigrain Loaf label\n",
  );
  return made;
}

// Part 5

// The sum of one number column over every row of the till.
function columnTotal(rows: Record<string, string>[], column: string): number {
  return rows.reduce((total, row) => total + Number(row[column]), 0);
}

// The product with the most waste, and how many of it were wasted.
function mostWasted(till: Record<string, string>[]): [string, number] {
  const wasteByProduct: Record<string, number> = {};
  for (const row of till) {
    wasteByProduct[row.product] = (wasteByProduct[row.product] ?? 0) + Number(row.waste);
  }
  const fromMostToLeast = Object.entries(wasteByProduct).sort(
    (first, second) => second[1] - first[1],
  );
  return fromMostToLeast[0];
}

export function mondayReport(folder: string) {
  const till = csvObjects(read(folder, "till/sales.csv"));
  const sold = columnTotal(till, "sold");
  const waste = columnTotal(till, "waste");
  const takings = columnTotal(till, "takings");
  const [worstProduct, worstWaste] = mostWasted(till);
  const worst = `${worstProduct} (${worstWaste})`;
  const summary =
    `The shop took ${money(takings)} and sold ${sold} items. ` +
    `${waste} were wasted, most of them ${worst}.`;
  save(
    folder,
    "out/reports/monday-report.md",
    `# The Monday report\n\n${summary}\n\n` +
      `## Sales\n\n- Takings: ${money(takings)}\n- Items sold: ${sold}\n\n` +
      `## Waste\n\n- Items wasted: ${waste}\n- Most waste: ${worst}\n\n` +
      "## Late payers\n\n- Kettle and Crumb\n- Moss and Grain\n",
  );
  return { sold, waste, takings: +takings.toFixed(2) };
}

// Part 6

const MENU_STYLE =
  "body{font-family:Georgia,serif;max-width:640px;margin:0 auto;padding:16px;" +
  "background:#fbf7f0;color:#2b2118}h1{font-size:28px}ul{list-style:none;padding:0}" +
  "li{display:grid;grid-template-columns:1fr auto;padding:10px 0;border-bottom:1px solid #e3d8c6}" +
  ".p{font-weight:bold}.a{grid-column:1/3;font-size:14px;color:#6b5a48}";

// One line of the menu: the product, its price and what it contains, read from its label.
function menuItem(folder: string, row: PriceRow): string {
  const slug = String(row.product).toLowerCase().replace(/ /g, "-");
  const labelPath = `out/labels/${slug}.md`;
  const label = existsSync(join(folder, labelPath)) ? read(folder, labelPath) : "";
  const contains = label.match(/Contains: (.*)/)?.[1] ?? "";
  const price = money(Number(row.shop_price));
  return (
    `<li><span class="n">${row.product}</span><span class="p">${price}</span>` +
    `<span class="a">Contains: ${contains}</span></li>`
  );
}

export function menuPage(folder: string) {
  const prices = readSpreadsheet(folder, "out/price-list-clean.xlsx");
  const items = prices.map((row) => menuItem(folder, row));
  save(
    folder,
    "out/site/index.html",
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      `<title>Wren Street Bakery menu</title><style>${MENU_STYLE}</style></head>` +
      "<body><h1>Wren Street Bakery</h1><p>Baked here every morning. Ask us about allergens.</p>" +
      `<ul>${items.join("")}</ul></body></html>\n`,
  );
  return items.length;
}
