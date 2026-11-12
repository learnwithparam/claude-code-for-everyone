// clean-the-orders: a clean copy of the orders export, read against the answer key. The original stays as it was.
import type { Rule } from "../scripts/verify";
import { KEY, bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { csvObjects } from "./lib/csv";

const FILE = "out/orders-clean.csv";
type Clean = { order_id: string; order_date: string; cafe: string; product: string; quantity: number };
const want: Record<string, Clean> = Object.fromEntries((KEY.orders.clean as Clean[]).map((o) => [o.order_id, o]));
const rows = (d: string) => csvObjects(text(d, FILE));
const COLS = ["order_id", "order_date", "cafe", "product", "quantity"];

export default [
  bakeryRule,
  { says: `${FILE} is there`, test: (d) => has(d, FILE), tryNext: "ask Claude to save the clean orders as out/orders-clean.csv" },
  {
    says: `it has the columns ${COLS.join(", ")}`,
    test: (d) => { const r = rows(d)[0]; return !!r && COLS.every((c) => c in r); },
    tryNext: "keep the same column names as the original file in the first row",
  },
  {
    says: "every date is written YYYY-MM-DD",
    test: (d) => rows(d).every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.order_date)),
    tryNext: "ask Claude to write every date as year-month-day, like 2026-09-03",
  },
  {
    says: "every date is the right date (phone orders are day first)",
    test: (d) => rows(d).every((r) => want[r.order_id]?.order_date === r.order_date),
    tryNext: "read the Dates part of notes/owner-notes.md: 03/09/2026 is the 3rd of September",
  },
  {
    says: `each cafe has one spelling, from customers/cafes.csv (${KEY.cafes.length} cafes)`,
    test: (d) => { const r = rows(d); return r.every((x) => KEY.cafes.includes(x.cafe)) && new Set(r.map((x) => x.cafe)).size === KEY.cafes.length; },
    tryNext: "ask Claude to use the exact names in customers/cafes.csv for every row",
  },
  {
    says: "no order is in the file twice",
    test: (d) => { const ids = rows(d).map((r) => r.order_id); return new Set(ids).size === ids.length; },
    tryNext: "ask Claude to remove rows that are exact copies, keeping one of each",
  },
  {
    says: `no real order was lost (${Object.keys(want).length} orders)`,
    test: (d) => { const ids = new Set(rows(d).map((r) => r.order_id)); return ids.size === Object.keys(want).length && Object.keys(want).every((i) => ids.has(i)); },
    tryNext: "only remove a row when every cell is the same as another row",
  },
  {
    says: "every quantity is a whole number, and the right one",
    test: (d) => rows(d).every((r) => /^\d+$/.test(r.quantity) && Number(r.quantity) === want[r.order_id]?.quantity),
    tryNext: 'ask Claude to turn words like "two dozen" into numbers, like 24',
  },
  { says: "the original orders file is the same as the start", test: originalsUnchanged, tryNext: "make a new file in out/ and leave the original alone; run bun run world reset to get it back" },
] satisfies Rule[];
