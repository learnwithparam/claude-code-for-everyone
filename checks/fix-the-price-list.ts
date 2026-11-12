// fix-the-price-list: a clean copy of the price list and a short log of exactly what changed.
import type { Rule } from "../scripts/verify";
import { KEY, bakeryRule, bytes, has, originalsUnchanged, text } from "./lib/bakery";
import { fold } from "./lib/md";
import { xlsxObjects } from "./lib/xlsx";

const FILE = "out/price-list-clean.xlsx";
const LOG = "out/price-changes.md";
type Price = { product: string; unit: string; shop_price: number; wholesale_price: number };
const want: Price[] = KEY.prices.clean;
const rows = (d: string) => xlsxObjects(bytes(d, FILE));
const row = (d: string, name: string) => rows(d).find((r) => String(r.product) === name);
const close = (a: unknown, b: number) => typeof a === "number" && Math.abs(a - b) < 0.005;
const fixed: string[] = KEY.prices.fixed;
const unchanged = want.map((p) => p.product).filter((n) => !fixed.includes(n));

export default [
  bakeryRule,
  { says: `${FILE} is there and opens as a spreadsheet`, test: (d) => has(d, FILE) && rows(d).length > 0, tryNext: "ask Claude to save the fixed list as a new .xlsx file in out/" },
  {
    says: "it has the columns product, unit, shop_price, wholesale_price",
    test: (d) => ["product", "unit", "shop_price", "wholesale_price"].every((c) => c in rows(d)[0]),
    tryNext: "ask Claude to keep the column names of the original price list",
  },
  {
    says: `every product name matches its recipe (${want.length} products)`,
    test: (d) => rows(d).length === want.length && want.every((p) => row(d, p.product)),
    tryNext: "ask Claude to compare each name with the first line of its file in recipes/ and fix the spelling",
  },
  {
    says: 'every row is priced for one item (unit is "each")',
    test: (d) => rows(d).every((r) => String(r.unit).toLowerCase() === "each"),
    tryNext: "ask Claude to find the row priced for a dozen and change it to the price for one",
  },
  {
    says: "every price is a number in pounds, and the right one",
    test: (d) => want.every((p) => { const r = row(d, p.product); return !!r && close(r.shop_price, p.shop_price) && close(r.wholesale_price, p.wholesale_price); }),
    tryNext: "ask Claude to look for a price in pence, like 280, and to save prices as numbers, not text",
  },
  {
    says: `${LOG} names the 3 products that changed`,
    test: (d) => has(d, LOG) && fixed.every((n) => fold(text(d, LOG)).includes(fold(n))),
    tryNext: "ask Claude to list each fix in out/price-changes.md, one line per product",
  },
  {
    says: `${LOG} names no product that did not change`,
    test: (d) => unchanged.every((n) => !fold(text(d, LOG)).includes(fold(n))),
    tryNext: "ask Claude to take out any line about a product that was already right",
  },
  { says: "the original price list is the same as the start", test: originalsUnchanged, tryNext: "ask Claude to save the fix as a new file in out/; run bun run world reset to get the original back" },
] satisfies Rule[];
