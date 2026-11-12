// Orientation: the bakery folder exists, nothing in it changed, and the learner wrote why they are here.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, originalsUnchanged, text } from "./lib/bakery";
import { words } from "./lib/md";

const FILE = "out/why-i-am-here.md";
const EXAMPLE = /\[|the task you do by hand at work/i;
const body = (d: string) => text(d, FILE).replace(/^#.*$/gm, "").trim();

export default [
  bakeryRule,
  { says: `${FILE} is there`, test: (d) => has(d, FILE), tryNext: "ask Claude to make out/why-i-am-here.md with your sentence in it" },
  {
    says: "it holds one sentence of 6 words or more",
    test: (d) => { const b = body(d); const n = words(b).length; return n >= 6 && n <= 60 && (b.match(/[.!?](\s|$)/g) ?? []).length <= 2; },
    tryNext: "ask Claude to save one full sentence about one task at your job, ending with a full stop",
  },
  { says: "the sentence is your own, not the example", test: (d) => !EXAMPLE.test(body(d)), tryNext: "tell Claude a task from your own job, not the example from the page" },
  { says: "every original bakery file is the same as the start", test: originalsUnchanged, tryNext: "run bun run world status to see what changed, then bun run world reset" },
] satisfies Rule[];
