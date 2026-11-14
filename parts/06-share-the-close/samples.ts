// Author tool: write the solution/ and wrong/<mistake>/ folders of every step in this part.
// A sample folder holds only the files a step makes or breaks; the checks read the rest from the
// seed. Every answer comes from the answer key in world/close.ts, never typed in by hand.
//   bun parts/06-share-the-close/samples.ts
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { KEY, ROOT, SEED } from "../../checks/lib/bakery";
import { writeSeed } from "../../world/build";
import * as close from "../../world/close";
import { nextCloseFiles } from "./next-close";
import { writeSample } from "./write-sample";

type Files = Record<string, string | Uint8Array>;

const PART = import.meta.dir;
const CHECKER = ".claude/agents/numbers-checker.md";
const CHECK_NOTE = "out/numbers-check.md";
const FINISHED_SKILLS = join(ROOT, "world", "finished", "bakery", ".claude", "skills");
const RECIPE_NAMES = (KEY.prices.clean as { product: string }[]).map((row) => row.product);
const WHY = "I want Claude to match our delivery notes to the orders so I stop doing it by hand.\n";

const sample = (step: string, kind: string, files: Files) =>
  writeSample(join(PART, step, kind), files);

// Every file under a folder, keyed by its path inside that folder.
function filesIn(folder: string, top = folder, found: Files = {}): Files {
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) filesIn(path, top, found);
    else found[relative(top, path).split(sep).join("/")] = readFileSync(path);
  }
  return found;
}

// Run the author's close on a copy of a bakery, and return the files it made in out/.
function closeOutputs(bakeryFiles: Files | undefined): Files {
  const work = join(mkdtempSync(join(tmpdir(), "wren-part-six-")), "wren-street");
  if (bakeryFiles) writeSeed(work, bakeryFiles);
  else cpSync(SEED, work, { recursive: true });
  close.whatsHere(work);
  close.cleanOrders(work);
  close.fixPriceList(work, RECIPE_NAMES);
  close.reconcile(work);
  close.labels(work);
  close.mondayReport(work);
  close.menuPage(work);
  const made = filesIn(join(work, "out"));
  rmSync(join(work, ".."), { recursive: true, force: true });
  return Object.fromEntries(Object.entries(made).map(([path, bytes]) => [`out/${path}`, bytes]));
}

const skillFile = (skill: string) => readFileSync(join(FINISHED_SKILLS, skill, "SKILL.md"), "utf8");

const bakeryClose = closeOutputs(undefined);
const menuPage = String(bakeryClose["out/site/index.html"]);

// ---- publish-the-menu-page ----

const PAGE = "out/site/index.html";
sample("01-publish-the-menu-page", "solution", { [PAGE]: menuPage });

let menuPrices = menuPage;
for (const [product, prices] of Object.entries(
  KEY.menuWrong as Record<string, { menu: number; list: number }>,
)) {
  const listPrice = `${product}</span><span class="p">£${prices.list.toFixed(2)}`;
  const menuPrice = `${product}</span><span class="p">£${prices.menu.toFixed(2)}`;
  menuPrices = menuPrices.replace(listPrice, menuPrice);
}
sample("01-publish-the-menu-page", "wrong/prices-from-the-old-menu", { [PAGE]: menuPrices });
sample("01-publish-the-menu-page", "wrong/allergens-from-the-old-labels", {
  [PAGE]: menuPage.replace("Contains: gluten, sesame, soya", "Contains: gluten, soya"),
});
const fontLink = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora">';
sample("01-publish-the-menu-page", "wrong/font-from-the-web", {
  [PAGE]: menuPage.replace("</title>", `</title>${fontLink}`),
});
sample("01-publish-the-menu-page", "wrong/focaccia-left-out", {
  [PAGE]: menuPage.replace(/<li><span class="n">Focaccia<\/span>.*?<\/li>/, ""),
});

// ---- pack-the-bakery-kit ----

const manifest = (fields: object) => `${JSON.stringify(fields, null, 2)}\n`;
const KIT_MANIFEST = {
  name: "wren-street-kit",
  version: "1.0.0",
  description: "The Wren Street Bakery skills: allergen labels and the Monday report.",
  author: { name: "Jess at Wren Street" },
  license: "CC0-1.0",
};
const kitSkills = (folder: string): Files => ({
  [`${folder}/allergen-label/SKILL.md`]: skillFile("allergen-label"),
  [`${folder}/monday-report/SKILL.md`]: skillFile("monday-report"),
});
const MANIFEST_PATH = "kit/.claude-plugin/plugin.json";
const HOOKS_PATH = "kit/hooks/hooks.json";
const HOOK_SCRIPT_PATH = "kit/hooks/block-till.sh";
const HOOKS = manifest({
  hooks: {
    PreToolUse: [
      {
        matcher: "Write|Edit",
        hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/block-till.sh" }],
      },
    ],
  },
});
const BLOCK_TILL = `#!/bin/bash
# Stop any edit to a file inside till/, because the till is the record.
input=$(cat)
if echo "$input" | grep -q '"file_path"[^,}]*till/'; then
  echo "Blocked: till/ is the record. Write a copy in out/ instead." >&2
  exit 2
fi
exit 0
`;
const kitHook: Files = { [HOOKS_PATH]: HOOKS, [HOOK_SCRIPT_PATH]: BLOCK_TILL };
sample("02-pack-the-bakery-kit", "solution", {
  [MANIFEST_PATH]: manifest(KIT_MANIFEST),
  ...kitSkills("kit/skills"),
  ...kitHook,
});
sample("02-pack-the-bakery-kit", "wrong/hook-lets-till-through", {
  [MANIFEST_PATH]: manifest(KIT_MANIFEST),
  ...kitSkills("kit/skills"),
  [HOOKS_PATH]: HOOKS,
  [HOOK_SCRIPT_PATH]: "#!/bin/bash\n# Lets every edit through.\nexit 0\n",
});
sample("02-pack-the-bakery-kit", "wrong/hook-never-wired", {
  [MANIFEST_PATH]: manifest(KIT_MANIFEST),
  ...kitSkills("kit/skills"),
  [HOOK_SCRIPT_PATH]: BLOCK_TILL,
});
sample("02-pack-the-bakery-kit", "wrong/skills-inside-claude-plugin", {
  [MANIFEST_PATH]: manifest(KIT_MANIFEST),
  ...kitSkills("kit/.claude-plugin/skills"),
  ...kitHook,
});
sample("02-pack-the-bakery-kit", "wrong/name-with-spaces", {
  [MANIFEST_PATH]: manifest({ ...KIT_MANIFEST, name: "Wren Street Kit" }),
  ...kitSkills("kit/skills"),
  ...kitHook,
});
sample("02-pack-the-bakery-kit", "wrong/no-version", {
  [MANIFEST_PATH]: manifest({ ...KIT_MANIFEST, version: undefined }),
  ...kitSkills("kit/skills"),
  ...kitHook,
});

// ---- run-the-friday-close ----

const { files: nextFiles } = nextCloseFiles();
const nextClose = closeOutputs(nextFiles);
const setupWork = mkdtempSync(join(tmpdir(), "wren-setup-"));
close.houseRules(setupWork);
close.safetyRules(setupWork);
const setup: Files = {
  "CLAUDE.md": readFileSync(join(setupWork, "CLAUDE.md")),
  ".claude/settings.json": readFileSync(join(setupWork, ".claude/settings.json")),
  ".claude/skills/friday-close/SKILL.md": skillFile("friday-close"),
  ".claude/skills/allergen-label/SKILL.md": skillFile("allergen-label"),
  ".claude/skills/monday-report/SKILL.md": skillFile("monday-report"),
  ".claude/agents/numbers-checker.md": readFileSync(
    join(PART, "..", "05-connect-and-schedule/03-write-the-monday-report/solution", CHECKER),
  ),
  "out/numbers-check.md": readFileSync(
    join(PART, "..", "05-connect-and-schedule/03-write-the-monday-report/solution", CHECK_NOTE),
  ),
};
rmSync(setupWork, { recursive: true, force: true });
const nextCloseOut = nextClose;
sample("03-run-the-friday-close", "solution", { ...setup, ...nextCloseOut });
sample("03-run-the-friday-close", "wrong/copied-the-old-close", { ...setup, ...bakeryClose });
const { ".claude/skills/friday-close/SKILL.md": _closeSkill, ...setupWithoutClose } = setup;
sample("03-run-the-friday-close", "wrong/no-close-skill", {
  ...setupWithoutClose,
  ...nextCloseOut,
});
// The close skipped its last job, so the menu page is missing.
const { [PAGE]: _menuPage, ...withoutMenuPage } = nextCloseOut;
sample("03-run-the-friday-close", "wrong/menu-page-skipped", { ...setup, ...withoutMenuPage });

// The close kept the old report: its numbers are the old till's, not the new one's.
sample("03-run-the-friday-close", "wrong/old-report-numbers", {
  ...setup,
  ...nextCloseOut,
  "out/reports/monday-report.md": bakeryClose["out/reports/monday-report.md"],
});

// ---- map-your-own-close ----

function closeMap(task: string, files: string[], rule: string, check: string): string {
  const fileLines = files.map((file) => `- ${file}`).join("\n");
  return (
    "# My own Friday close\n\n" +
    `## My task\n\n${task}\n\n` +
    `## Files it needs\n\n${fileLines}\n\n` +
    `## First rule for its CLAUDE.md\n\n${rule}\n\n` +
    `## One check a script could run\n\n${check}\n`
  );
}

const MY_TASK = "Match our delivery notes to the orders, so I stop doing it by hand.";
const MY_FILES = ["delivery-notes/*.pdf", "orders/open-orders.csv", "customers.csv"];
const MY_RULE = "Never change an order. Write each match in out/ for me to read.";
const MY_CHECK =
  "Every delivery note number is in out/matches.csv once, " +
  "and every order it names is in orders/open-orders.csv.";
const MAP = "out/friday-close.md";
const whyFile = { "out/why-i-am-here.md": WHY };
sample("04-map-your-own-close", "solution", {
  ...whyFile,
  [MAP]: closeMap(MY_TASK, MY_FILES, MY_RULE, MY_CHECK),
});
sample("04-map-your-own-close", "wrong/the-bakery-not-my-job", {
  ...whyFile,
  [MAP]: closeMap(
    "Run the Friday close for the bakery.",
    ["orders/wholesale-orders.csv", "till/sales.csv"],
    MY_RULE,
    MY_CHECK,
  ),
});
sample("04-map-your-own-close", "wrong/no-check", {
  ...whyFile,
  [MAP]: closeMap(MY_TASK, MY_FILES, MY_RULE, "Claude checks it."),
});

console.log("Wrote the samples for share-the-close.");
