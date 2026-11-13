// set-the-safety-rules: Manual mode by default, no writes outside the folder,
// and the learner says what Manual mode asks about.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { bullets, fold, section } from "./lib/md";

const SETTINGS = ".claude/settings.json";
const SAFETY = "out/safety.md";
const settings = (folder: string) => JSON.parse(text(folder, SETTINGS));

export default [
  bakeryRule,
  {
    says: `${SETTINGS} is there and is valid`,
    test: (folder) => typeof settings(folder) === "object",
    tryNext: "ask Claude to make .claude/settings.json and check it has no extra commas",
  },
  {
    says: "Claude starts in Manual mode (defaultMode is default)",
    test: (folder) => settings(folder).permissions?.defaultMode === "default",
    tryNext:
      'ask Claude to set "defaultMode" to "default" inside "permissions"; that is Manual mode',
  },
  {
    says: "Claude cannot write outside the bakery folder",
    test: (folder) => settings(folder).permissions?.blockWritesOutsideWorkingDirectories === true,
    tryNext:
      'ask Claude to set "blockWritesOutsideWorkingDirectories" to true inside "permissions"',
  },
  {
    says: "out/safety.md names Manual mode",
    test: (folder) => has(folder, SAFETY) && fold(text(folder, SAFETY)).includes("manual"),
    tryNext: "ask Claude to say in out/safety.md that you work in Manual mode",
  },
  {
    says: 'out/safety.md lists 2 things under "Claude will ask me before"',
    test: (folder) => {
      const askFirst = section(text(folder, SAFETY), "claude will ask me before") ?? "";
      return bullets(askFirst).length >= 2;
    },
    tryNext:
      'ask Claude to add a heading "## Claude will ask me before" ' +
      "with two lines that start with a dash",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
