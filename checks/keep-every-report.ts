// keep-every-report: each run of the monday-report skill keeps its own report, with a time on it.
// The rules are the first part of what schedule-the-monday-report checks.
import type { Rule } from "../scripts/verify";
import { bakeryRule, originalsUnchanged } from "./lib/bakery";
import { KEEP_RULES } from "./schedule-the-monday-report";

export default [
  bakeryRule,
  ...KEEP_RULES,
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
