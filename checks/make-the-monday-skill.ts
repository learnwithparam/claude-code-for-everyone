// make-the-monday-skill: a monday-report skill, and one report it made from the till.
// The rules are the skill and report rules that write-the-monday-report builds on.
import type { Rule } from "../scripts/verify";
import { bakeryRule, originalsUnchanged } from "./lib/bakery";
import { SKILL_RULES } from "./write-the-monday-report";

export default [
  bakeryRule,
  ...SKILL_RULES,
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
