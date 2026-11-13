// open-the-terminal: the learner runs Claude Code in a terminal, in the bakery folder.
// They write down the version, what the status bar said in Plan mode, and the mode they work in.
import { MIN_VERSION } from "../config/claude";
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { fold, section } from "./lib/md";

const FILE = "out/terminal.md";
const VERSION = /\b(\d+)\.(\d+)\.(\d+)\b/;

// The first version number written under the "Version" heading, like 2.1.323.
function writtenVersion(folder: string): number[] | undefined {
  const versionPart = section(text(folder, FILE), "version") ?? "";
  const found = versionPart.match(VERSION);
  if (!found) return undefined;
  return [Number(found[1]), Number(found[2]), Number(found[3])];
}

// True when the version is the same as the oldest one the course is tested on, or newer.
function newEnough(version: number[]): boolean {
  const oldest = MIN_VERSION.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (version[i] !== oldest[i]) return version[i] > oldest[i];
  }
  return true;
}

function statusBar(folder: string): string {
  return fold(section(text(folder, FILE), "status bar") ?? "");
}

function workingMode(folder: string): string {
  return fold(section(text(folder, FILE), "mode i work in") ?? "");
}

export default [
  bakeryRule,
  {
    says: `${FILE} is there`,
    test: (folder) => has(folder, FILE),
    tryNext: "ask Claude to make out/terminal.md, as the step page shows",
  },
  {
    says: 'it has a Claude Code version, like 2.1.323, under "## Version"',
    test: (folder) => writtenVersion(folder) !== undefined,
    tryNext: 'run claude --version and ask Claude to put what it printed under "## Version"',
  },
  {
    says: `the version is ${MIN_VERSION} or newer`,
    test: (folder) => {
      const version = writtenVersion(folder);
      return version !== undefined && newEnough(version);
    },
    tryNext: "update Claude Code (run claude update), then write the new version",
  },
  {
    says: 'it says what the status bar showed in Plan mode, under "## Status bar"',
    test: (folder) => statusBar(folder).includes("plan mode"),
    tryNext: "press Shift+Tab until the status bar says plan mode on, then copy those words",
  },
  {
    says: 'it names Manual mode under "## Mode I work in"',
    test: (folder) => {
      const mode = workingMode(folder);
      return mode.includes("manual") && !mode.includes("auto");
    },
    tryNext:
      "press Shift+Tab until the status bar says manual mode on, or no mode, then write Manual",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
