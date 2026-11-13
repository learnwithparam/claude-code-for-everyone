// plan-the-invoice-check: a plan saved before any work starts.
// It names the purchase orders as the source of truth and only writes into out/.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { fold, section } from "./lib/md";

const FILE = "out/plans/invoice-check.md";
const HEADINGS = ["Goal", "Files I will read", "Files I will write", "Steps", "Risks"];
const TRUTH = "purchase-orders.csv";

// Any path to a file that the plan names, like out/reconciliation.csv or invoices/FD-2201.pdf.
const FILE_PATH = /[\w./*-]+\.(csv|md|xlsx|pdf|html|json|txt)\b/g;

const plan = (folder: string) => text(folder, FILE);
const filesToWrite = (folder: string) => {
  const written = section(plan(folder), "files i will write") ?? "";
  return written.match(FILE_PATH) ?? [];
};

function hasEveryHeading(folder: string): boolean {
  const written = plan(folder);
  return HEADINGS.every((heading) => section(written, heading.toLowerCase()) !== undefined);
}

// One line, or one paragraph, says the purchase orders file is the truth.
function namesTheTruth(folder: string): boolean {
  const paragraphs = fold(plan(folder)).split(/\n\s*\n|\n(?=\s*[-*\d])/);
  return paragraphs.some((paragraph) => paragraph.includes(TRUTH) && paragraph.includes("truth"));
}

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (folder) => has(folder, FILE),
    tryNext: "ask Claude to save the plan it showed you as out/plans/invoice-check.md",
  },
  {
    says: `it has the headings ${HEADINGS.join(", ")}`,
    test: hasEveryHeading,
    tryNext: "ask Claude to use these five headings, each on its own line starting with ##",
  },
  {
    says: `it names ${TRUTH} as the source of truth`,
    test: namesTheTruth,
    tryNext: `ask Claude to say in one line: "The source of truth is ${TRUTH}."`,
  },
  {
    says: "Files I will write names at least one file, and every one is in out/",
    test: (folder) => {
      const paths = filesToWrite(folder);
      return paths.length > 0 && paths.every((path) => path.startsWith("out/"));
    },
    tryNext: "ask Claude to list the new files it will make, each one inside out/",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "a plan changes nothing; run bun run world status, then bun run world reset",
  },
] satisfies Rule[];
