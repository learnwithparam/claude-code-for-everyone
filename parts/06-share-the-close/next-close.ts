// Make a second bakery folder, wren-street-next-close/, with orders, bills and till sales you have
// never seen. It also gets your Claude Code setup from wren-street/: CLAUDE.md, .claude/ (the
// settings, hooks and skills), .mcp.json and kit/. Then you run your Friday close on it, once.
//   bun parts/06-share-the-close/next-close.ts           make it (once)
//   bun parts/06-share-the-close/next-close.ts reset     make it again from the start
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { BAKERY } from "../../checks/lib/bakery";
import { build, writeSeed } from "../../world/build";

// The same seed number always builds the same new orders, bills and till.
export const NEXT_SEED = 11;
export const NEXT_CLOSE = join(dirname(BAKERY), "wren-street-next-close");
// What a learner set up for Claude Code in the bakery, and carries to the next close.
export const SETUP = ["CLAUDE.md", ".claude", ".mcp.json", "kit"];

export function nextCloseFiles() {
  return build(NEXT_SEED);
}

function makeNextClose() {
  const { files } = nextCloseFiles();
  writeSeed(NEXT_CLOSE, files);
  mkdirSync(join(NEXT_CLOSE, "out"), { recursive: true });
  const carried: string[] = [];
  for (const item of SETUP) {
    const from = join(BAKERY, item);
    if (!existsSync(from)) continue;
    cpSync(from, join(NEXT_CLOSE, item), { recursive: true });
    carried.push(item);
  }
  return carried;
}

if (import.meta.main) {
  const reset = process.argv[2] === "reset";
  if (!existsSync(BAKERY)) {
    console.log("There is no bakery folder yet. Run: bun run world");
    process.exit(1);
  }
  if (existsSync(NEXT_CLOSE) && !reset) {
    console.log("The next close is already here: wren-street-next-close/");
    console.log("To start it again, run: bun parts/06-share-the-close/next-close.ts reset");
    process.exit(0);
  }
  rmSync(NEXT_CLOSE, { recursive: true, force: true });
  const carried = makeNextClose();
  console.log("Made the next close: wren-street-next-close/");
  console.log(`Copied your setup from wren-street/: ${carried.join(", ") || "nothing yet"}`);
  console.log("Next: open wren-street-next-close in Claude Code and run your Friday close.");
}
