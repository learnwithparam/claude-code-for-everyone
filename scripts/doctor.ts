// bun run doctor: is this computer ready for the course? It asks Claude Code itself (`claude --version` and
// `claude auth status`). It never reads a credentials file and never prints an account name or email.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MIN_VERSION, TESTED_ON, claudeStatus } from "../config/claude";

const ROOT = join(import.meta.dir, "..");
const line = (ok: boolean, what: string) => console.log(`  ${ok ? "PASS" : "FAIL"}  ${what}`);
let bad = 0;

console.log("Checking this computer for the course:");
line(true, `Bun ${Bun.version} runs the checks`);

const s = claudeStatus();
if (!s.installed) {
  bad++;
  line(false, "Claude Code is installed (the claude command was not found)");
  console.log("        Try next: install Claude Code from 00-orientation/README.md, then open a new terminal");
} else {
  line(!!s.newEnough, `Claude Code ${s.version} is installed (the course needs ${MIN_VERSION} or newer, tested on ${TESTED_ON})`);
  if (!s.newEnough) { bad++; console.log("        Try next: run claude update"); }
  line(!!s.signedIn, s.signedIn ? `Claude Code is signed in (${s.how === "api_key" ? "a Console account" : "your Claude account"})` : "Claude Code is signed in");
  if (!s.signedIn) { bad++; console.log("        Try next: run claude, then type /login and follow the steps"); }
}

const bakery = existsSync(join(ROOT, "wren-street"));
console.log(`  ${bakery ? "PASS" : "NEXT"}  the bakery folder wren-street/ ${bakery ? "is there" : "is not made yet: run bun run world"}`);

console.log(bad ? `${bad} thing(s) to fix. See 00-orientation/troubleshooting.md.` : "Ready. Claude Code is installed and signed in.");
process.exit(bad ? 1 : 0);
