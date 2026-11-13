// rewind-a-bad-edit: Claude made a bad edit to the menu, and rewind put it back.
// The menu is the same as at the save point, and the undo log says how it was undone.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../scripts/verify";
import { bakeryRule, bytes, has, SEED, text } from "./lib/bakery";
import { fold } from "./lib/md";

const MENU = "menu/menu.md";
const LOG = "out/undo-log.md";
// Ways to say how: the command, the keys, or the menu choice.
const HOW = ["/rewind", "esc", "restore code"];

// True when a file is byte for byte the same as at the start, which is what the save point holds.
export function sameAsSavePoint(folder: string, relativePath: string): boolean {
  const now = Buffer.from(bytes(folder, relativePath));
  const saved = readFileSync(join(SEED, relativePath));
  return now.equals(saved);
}

const logLines = (folder: string) => fold(text(folder, LOG)).split("\n");

function saysHowItWasRewound(folder: string): boolean {
  const saysRewound = (line: string) => line.includes("rewound");
  const saysHow = (line: string) => HOW.some((way) => line.includes(way));
  return logLines(folder).some((line) => saysRewound(line) && saysHow(line));
}

export default [
  bakeryRule,
  {
    says: `${MENU} is the same as at the save point`,
    test: (folder) => sameAsSavePoint(folder, MENU),
    tryNext: "type /rewind, pick the prompt before the bad edit, and choose Restore code",
  },
  {
    says: `${LOG} is there`,
    test: (folder) => has(folder, LOG),
    tryNext: "ask Claude to start out/undo-log.md with one line about what you undid",
  },
  {
    says: 'a line in the undo log says "rewound" and how: /rewind, Esc or Restore code',
    test: saysHowItWasRewound,
    tryNext:
      'ask Claude to add the line "- menu.md: rewound with /rewind and Restore code" to the log',
  },
] satisfies Rule[];
