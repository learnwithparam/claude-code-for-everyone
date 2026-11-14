// read-the-folder: Claude reads the folder and writes what is in it. Nothing else changes.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { bullets, fold, section, words } from "./lib/md";

const FILE = "out/whats-here.md";
const PROMPTS = "out/prompts.md";
const SHOT = "out/screenshot-note.md";
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

// An @ mention is "@" then a path. It counts when that path is a real file in the bakery.
const AT_PATH = /(?:^|\s)@([\w][\w./-]*\.\w+)/g;
function mentionsRealFile(folder: string): boolean {
  const mentions = [...text(folder, PROMPTS).matchAll(AT_PATH)];
  return mentions.some((mention) => has(folder, mention[1]));
}

// The screenshot note says what was shot, then what Claude said about it.
function screenshotNoteIsReal(folder: string): boolean {
  const note = text(folder, SHOT);
  const shot = note.match(/^screenshot of:\s*(\S.*)$/im);
  const said = section(note, "what claude said") ?? "";
  return !!shot && words(shot[1]).length >= 2 && words(said).length >= 15;
}

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
    says: `${PROMPTS} is a saved prompt that points at a real file with @`,
    test: (folder) => has(folder, PROMPTS) && mentionsRealFile(folder),
    tryNext: "save it in out/prompts.md with @ and a path, like @orders/wholesale-orders.csv",
  },
  {
    says: `${SHOT} has a "Screenshot of:" line and a "What Claude said" part`,
    test: (folder) => has(folder, SHOT) && screenshotNoteIsReal(folder),
    tryNext: 'start with "Screenshot of:" and what you shot, then add "## What Claude said"',
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
