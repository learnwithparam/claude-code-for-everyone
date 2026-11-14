// clean-the-orders: a clean copy of the orders export, read against the answer key.
// The original stays as it was.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, KEY, originalsUnchanged, text } from "./lib/bakery";
import { csvObjects } from "./lib/csv";
import { section, words } from "./lib/md";

const FILE = "out/orders-clean.csv";
const NOTE = "out/diff-note.md";

// One order as the answer key has it. The names match the CSV column names.
type CleanOrder = {
  // biome-ignore lint/style/useNamingConvention: the CSV column is called order_id
  order_id: string;
  // biome-ignore lint/style/useNamingConvention: the CSV column is called order_date
  order_date: string;
  cafe: string;
  product: string;
  quantity: number;
};

const answerKey: CleanOrder[] = KEY.orders.clean;
const rightOrders: Record<string, CleanOrder> = Object.fromEntries(
  answerKey.map((order) => [order.order_id, order]),
);
const rightOrderIds = Object.keys(rightOrders);
const COLUMNS = ["order_id", "order_date", "cafe", "product", "quantity"];

const rows = (folder: string) => csvObjects(text(folder, FILE));
const orderIds = (folder: string) => rows(folder).map((row) => row.order_id);

function hasTheColumns(folder: string): boolean {
  const firstRow = rows(folder)[0];
  return !!firstRow && COLUMNS.every((column) => column in firstRow);
}

function everyCafeSpelledOneWay(folder: string): boolean {
  const allRows = rows(folder);
  const allKnown = allRows.every((row) => KEY.cafes.includes(row.cafe));
  const differentCafes = new Set(allRows.map((row) => row.cafe));
  return allKnown && differentCafes.size === KEY.cafes.length;
}

function noOrderTwice(folder: string): boolean {
  const ids = orderIds(folder);
  return new Set(ids).size === ids.length;
}

function noOrderLost(folder: string): boolean {
  const ids = new Set(orderIds(folder));
  return ids.size === rightOrderIds.length && rightOrderIds.every((id) => ids.has(id));
}

function rightQuantity(row: Record<string, string>): boolean {
  const isWholeNumber = /^\d+$/.test(row.quantity);
  return isWholeNumber && Number(row.quantity) === rightOrders[row.order_id]?.quantity;
}

// An order the clean copy changed: its original row has a different date, cafe or quantity.
function wasChanged(folder: string, id: string): string[] {
  const right = rightOrders[id];
  const before = csvObjects(text(folder, "orders/wholesale-orders.csv")).find(
    (row) => row.order_id === id,
  );
  if (!right || !before) return [];
  const afterValues = [right.order_date, right.cafe, String(right.quantity)];
  const beforeValues = [before.order_date, before.cafe, before.quantity];
  return afterValues.filter((value, index) => value !== beforeValues[index]);
}

// A note line that names a changed order and quotes what it became.
function namesChangedLine(folder: string): boolean {
  return text(folder, NOTE)
    .split("\n")
    .some((line) => {
      const id = line.match(/WS-\d{4}/)?.[0];
      return !!id && wasChanged(folder, id).some((value) => line.includes(value));
    });
}

const saysWhy = (folder: string) => words(section(text(folder, NOTE), "why") ?? "").length >= 6;

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (folder) => has(folder, FILE),
    tryNext: "ask Claude to save the clean orders as out/orders-clean.csv",
  },
  {
    says: `it has the columns ${COLUMNS.join(", ")}`,
    test: hasTheColumns,
    tryNext: "ask Claude to use the column names of the original file in the first row",
  },
  {
    says: "every date is written YYYY-MM-DD",
    test: (folder) => rows(folder).every((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.order_date)),
    tryNext: "ask Claude to write every date as year, month, day: YYYY-MM-DD",
  },
  {
    says: "every date is the right date (phone orders are day first)",
    test: (folder) =>
      rows(folder).every((row) => rightOrders[row.order_id]?.order_date === row.order_date),
    tryNext:
      "phone orders put the day first; ask Claude to read the Dates part of notes/owner-notes.md",
  },
  {
    says: `each cafe has one spelling, from customers/cafes.csv (${KEY.cafes.length} cafes)`,
    test: everyCafeSpelledOneWay,
    tryNext: "ask Claude to use the exact names in customers/cafes.csv for every row",
  },
  {
    says: "no order is in the file twice",
    test: noOrderTwice,
    tryNext: "ask Claude to remove rows that are exact copies, keeping one of each",
  },
  {
    says: `no real order was lost (${rightOrderIds.length} orders)`,
    test: noOrderLost,
    tryNext: "ask Claude to remove a row only when every cell is the same as another row",
  },
  {
    says: "every quantity is a whole number, and the right one",
    test: (folder) => rows(folder).every(rightQuantity),
    tryNext: 'ask Claude to turn words like "two dozen" into numbers, like 24',
  },
  {
    says: `${NOTE} names a changed order and what it became`,
    test: (folder) => has(folder, NOTE) && namesChangedLine(folder),
    tryNext: "write one line with an order id like WS-1001 and its new date, cafe or number",
  },
  {
    says: `${NOTE} has a "Why it is right" part with a reason`,
    test: (folder) => has(folder, NOTE) && saysWhy(folder),
    tryNext: 'add a heading "## Why it is right" and say why the change is right, in a sentence',
  },
  {
    says: "the original orders file is the same as the start",
    test: originalsUnchanged,
    tryNext:
      "ask Claude for a new file in out/ and to leave the original alone; " +
      "run bun run world reset to get it back",
  },
] satisfies Rule[];
