// set-the-safety-rules: Manual mode by default, no writes outside the folder, and the learner says what Manual asks.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { bullets, fold, section } from "./lib/md";

const SETTINGS = ".claude/settings.json";
const settings = (d: string) => JSON.parse(text(d, SETTINGS));

export default [
  bakeryRule,
  { says: `${SETTINGS} is there and is valid`, test: (d) => typeof settings(d) === "object", tryNext: "ask Claude to make .claude/settings.json and check it has no extra commas" },
  {
    says: "Claude starts in Manual mode (defaultMode is default)",
    test: (d) => settings(d).permissions?.defaultMode === "default",
    tryNext: 'ask Claude to set "defaultMode" to "default" inside "permissions"; that is Manual mode',
  },
  {
    says: "Claude cannot write outside the bakery folder",
    test: (d) => settings(d).permissions?.blockWritesOutsideWorkingDirectories === true,
    tryNext: 'ask Claude to set "blockWritesOutsideWorkingDirectories" to true inside "permissions"',
  },
  {
    says: "out/safety.md names Manual mode",
    test: (d) => has(d, "out/safety.md") && fold(text(d, "out/safety.md")).includes("manual"),
    tryNext: "ask Claude to say in out/safety.md that you work in Manual mode",
  },
  {
    says: 'out/safety.md lists 2 things under "Claude will ask me before"',
    test: (d) => bullets(section(text(d, "out/safety.md"), "claude will ask me before") ?? "").length >= 2,
    tryNext: 'ask Claude to add a heading "## Claude will ask me before" with two lines that start with a dash',
  },
  { says: "every original bakery file is the same as the start", test: originalsUnchanged, tryNext: "run bun run world status to see what changed, then bun run world reset" },
] satisfies Rule[];
