// bun run world          make the bakery folder, wren-street/, from the seed (once)
// bun run world reset    put the bakery back to the start. Your old folder is kept as wren-street-backup-N/
// bun run world status   say which files differ from the start
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { BAKERY, changedOriginals, ROOT, SEED } from "../checks/lib/bakery";

const LOG_DIR = join(ROOT, ".world");
const log = (event: string, detail = "") => {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(
    join(LOG_DIR, "log.jsonl"),
    `${JSON.stringify({ at: new Date().toISOString(), event, detail })}\n`,
  );
};

function make() {
  cpSync(SEED, BAKERY, { recursive: true });
  mkdirSync(join(BAKERY, "out"), { recursive: true });
}

const cmd = process.argv[2] ?? "make";
if (cmd === "make") {
  if (existsSync(BAKERY)) {
    console.log("The bakery folder is already here: wren-street/");
    console.log("To start it again, run: bun run world reset");
    process.exit(0);
  }
  make();
  log("make");
  console.log("Made the bakery folder: wren-street/");
  console.log("Next: open wren-street in the Claude app.");
} else if (cmd === "reset") {
  let backup = "";
  if (existsSync(BAKERY)) {
    let n = 1;
    while (existsSync(join(ROOT, `wren-street-backup-${n}`))) n++;
    backup = `wren-street-backup-${n}`;
    renameSync(BAKERY, join(ROOT, backup));
  }
  make();
  log("reset", backup);
  console.log(backup ? `Kept your old folder as ${backup}/` : "There was no old folder to keep.");
  console.log("The bakery folder is back to the start: wren-street/");
} else if (cmd === "status") {
  if (!existsSync(BAKERY)) {
    console.log("There is no bakery folder yet. Run: bun run world");
    process.exit(1);
  }
  const changed = changedOriginals(BAKERY);
  const made = existsSync(join(BAKERY, "out"))
    ? readdirSync(join(BAKERY, "out")).filter((f) => f !== ".keep")
    : [];
  console.log(
    changed.length
      ? `Changed or missing originals: ${changed.join(", ")}`
      : "Every original file is the same as the start.",
  );
  console.log(`Files in out/: ${made.length ? made.join(", ") : "none yet"}`);
} else {
  console.log(
    `There is no world command called "${cmd}". Use: bun run world, bun run world reset, bun run world status`,
  );
  process.exit(1);
}
