// bun run doctor: is this computer ready for the course?
// It asks Claude Code itself (`claude --version` and `claude auth status`).
// It never reads a credentials file and never prints an account name or email.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { claudeStatus, MIN_VERSION, TESTED_ON } from "../config/claude";

const ROOT = join(import.meta.dir, "..");
const line = (ok: boolean, what: string) => console.log(`  ${ok ? "PASS" : "FAIL"}  ${what}`);
const tryNext = (advice: string) => console.log(`        Try next: ${advice}`);
let problems = 0;

console.log("Checking this computer for the course:");
line(true, `Bun ${Bun.version} runs the checks`);

const status = claudeStatus();
if (!status.installed) {
  problems++;
  line(false, "Claude Code is installed (the claude command was not found)");
  tryNext("install Claude Code from 00-orientation/README.md, then open a new terminal");
} else {
  const needs = `the course needs ${MIN_VERSION} or newer, tested on ${TESTED_ON}`;
  line(!!status.newEnough, `Claude Code ${status.version} is installed (${needs})`);
  if (!status.newEnough) {
    problems++;
    tryNext("run claude update");
  }
  if (status.signedIn) {
    const account = status.how === "api_key" ? "a Console account" : "your Claude account";
    line(true, `Claude Code is signed in (${account})`);
  } else {
    problems++;
    line(false, "Claude Code is signed in");
    tryNext("run claude, then type /login and follow the steps");
  }
}

// The bakery is made in a later step, so a missing one is NEXT, not FAIL.
if (existsSync(join(ROOT, "wren-street"))) {
  console.log("  PASS  the bakery folder wren-street/ is there");
} else {
  console.log("  NEXT  the bakery folder wren-street/ is not made yet: run bun run world");
}

if (problems) console.log(`${problems} thing(s) to fix. See 00-orientation/troubleshooting.md.`);
else console.log("Ready. Claude Code is installed and signed in.");
process.exit(problems ? 1 : 0);
