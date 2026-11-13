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

// A folder counts as named when the text has it with a dash or with a space.
const named = (written: string, folderName: string) =>
  fold(written).includes(folderName) || fold(written).includes(folderName.replace(/-/g, " "));

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (folder) => has(folder, FILE),
    tryNext: "ask Claude to write what it found into out/whats-here.md",
  },
  {
    says: `it names all ${FOLDERS.length} folders of the bakery`,
    test: (folder) => FOLDERS.every((folderName) => named(text(folder, FILE), folderName)),
    tryNext: "ask Claude to add one line for every folder, from orders to notes",
  },
  {
    says: 'it has a "Questions I have" part with 2 or more questions',
    test: (folder) => {
      const questions = section(text(folder, FILE), "questions i have") ?? "";
      return bullets(questions).length >= 2;
    },
    tryNext:
      'ask Claude to add a heading "## Questions I have" with two questions that start with a dash',
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
