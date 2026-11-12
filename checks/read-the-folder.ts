// read-the-folder: Claude reads the folder and writes what is in it. Nothing else changes.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { bullets, fold, section } from "./lib/md";

const FILE = "out/whats-here.md";
export const FOLDERS = [
  "orders",
  "customers",
  "prices",
  "invoices",
  "purchase-orders",
  "recipes",
  "allergens",
  "labels",
  "menu",
  "till",
  "notes",
];
const named = (t: string, f: string) =>
  fold(t).includes(f) || fold(t).includes(f.replace(/-/g, " "));

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (d) => has(d, FILE),
    tryNext: "ask Claude to write what it found into out/whats-here.md",
  },
  {
    says: `it names all ${FOLDERS.length} folders of the bakery`,
    test: (d) => FOLDERS.every((f) => named(text(d, FILE), f)),
    tryNext: "ask Claude to add one line for every folder, from orders to notes",
  },
  {
    says: 'it has a "Questions I have" part with 2 or more questions',
    test: (d) => bullets(section(text(d, FILE), "questions i have") ?? "").length >= 2,
    tryNext:
      'ask Claude to add a heading "## Questions I have" with two questions that start with a dash',
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
