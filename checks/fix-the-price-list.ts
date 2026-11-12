// fix-the-price-list: a clean copy of the price list and a short log of exactly what changed.
import type { Rule } from "../scripts/verify";
import { bakeryRule, bytes, has, KEY, originalsUnchanged, text } from "./lib/bakery";
import { fold } from "./lib/md";
import { xlsxObjects } from "./lib/xlsx";

const FILE = "out/price-list-clean.xlsx";
const LOG = "out/price-changes.md";

// One product as the answer key has it. The names match the spreadsheet column names.
type Price = {
  product: string;
  unit: string;
  // biome-ignore lint/style/useNamingConvention: the spreadsheet column is called shop_price
  shop_price: number;
  // biome-ignore lint/style/useNamingConvention: the spreadsheet column is called wholesale_price
  wholesale_price: number;
};
const rightPrices: Price[] = KEY.prices.clean;
const fixedProducts: string[] = KEY.prices.fixed;
const productNames = rightPrices.map((price) => price.product);
const unchangedProducts = productNames.filter((name) => !fixedProducts.includes(name));
const COLUMNS = ["product", "unit", "shop_price", "wholesale_price"];

const rows = (folder: string) => xlsxObjects(bytes(folder, FILE));
const rowFor = (folder: string, product: string) =>
  rows(folder).find((row) => String(row.product) === product);

// Prices are compared to the nearest half penny, so 2.8 and 2.80 both count.
const closeTo = (found: unknown, wanted: number) =>
  typeof found === "number" && Math.abs(found - wanted) < 0.005;

function rightPrice(folder: string, price: Price): boolean {
  const row = rowFor(folder, price.product);
  if (!row) return false;
  return (
    closeTo(row.shop_price, price.shop_price) &&
    closeTo(row.wholesale_price, price.wholesale_price)
  );
}

const logNames = (folder: string, product: string) =>
  fold(text(folder, LOG)).includes(fold(product));

export default [
  bakeryRule,
  {
    says: `${FILE} is there and opens as a spreadsheet`,
    test: (folder) => has(folder, FILE) && rows(folder).length > 0,
    tryNext: "ask Claude to save the fixed list as a new .xlsx file in out/",
  },
  {
    says: "it has the columns product, unit, shop_price, wholesale_price",
    test: (folder) => COLUMNS.every((column) => column in rows(folder)[0]),
    tryNext: "ask Claude to keep the column names of the original price list",
  },
  {
    says: `every product name matches its recipe (${rightPrices.length} products)`,
    test: (folder) =>
      rows(folder).length === rightPrices.length &&
      productNames.every((product) => rowFor(folder, product)),
    tryNext:
      "ask Claude to compare each name with the first line of its file in recipes/ " +
      "and fix the spelling",
  },
  {
    says: 'every row is priced for one item (unit is "each")',
    test: (folder) => rows(folder).every((row) => String(row.unit).toLowerCase() === "each"),
    tryNext: "ask Claude to find the row priced for a dozen and change it to the price for one",
  },
  {
    says: "every price is a number in pounds, and the right one",
    test: (folder) => rightPrices.every((price) => rightPrice(folder, price)),
    tryNext:
      "ask Claude to look for a price in pence, like 280, and to save prices as numbers, not text",
  },
  {
    says: `${LOG} names the 3 products that changed`,
    test: (folder) =>
      has(folder, LOG) && fixedProducts.every((product) => logNames(folder, product)),
    tryNext: "ask Claude to list each fix in out/price-changes.md, one line per product",
  },
  {
    says: `${LOG} names no product that did not change`,
    test: (folder) => unchangedProducts.every((product) => !logNames(folder, product)),
    tryNext: "ask Claude to take out any line about a product that was already right",
  },
  {
    says: "the original price list is the same as the start",
    test: originalsUnchanged,
    tryNext:
      "ask Claude to save the fix as a new file in out/; " +
      "run bun run world reset to get the original back",
  },
] satisfies Rule[];
