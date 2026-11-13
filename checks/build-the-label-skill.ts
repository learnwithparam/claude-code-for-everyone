// build-the-label-skill: a skill that makes shelf labels, and the 12 labels it made.
// Each label lists exactly the allergens in its recipe and the shop price from the clean list.
// The answers come from world/key.json.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, KEY, originalsUnchanged, text } from "./lib/bakery";
import { fold, section } from "./lib/md";

const SKILL = ".claude/skills/allergen-label/SKILL.md";
const LABELS = "out/labels";

type Product = { name: string; allergens: string[] };
// One row of the clean price list. The name matches the spreadsheet's column name.
// biome-ignore lint/style/useNamingConvention: the spreadsheet column is called shop_price
type PriceRow = { product: string; shop_price: number };

const PRODUCTS: Record<string, Product> = KEY.labels;
const SLUGS = Object.keys(PRODUCTS);
const PRICE_ROWS: PriceRow[] = KEY.prices.clean;

const skill = (folder: string) => text(folder, SKILL);
const label = (folder: string, slug: string) => text(folder, `${LABELS}/${slug}.md`);

// The lines between the two --- lines at the top of the skill.
function frontmatter(folder: string): string {
  return skill(folder).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

function frontmatterField(folder: string, field: string): string {
  const pattern = new RegExp(`^${field}:\\s*(.+)$`, "m");
  return frontmatter(folder).match(pattern)?.[1]?.trim() ?? "";
}

// The text after "Name:" on the first line that starts with it, such as "Contains:".
export function fieldOf(labelText: string, name: string): string | undefined {
  const line = labelText.split("\n").find((candidate) => fold(candidate).startsWith(name));
  return line?.slice(line.indexOf(":") + 1).trim();
}

// One allergen written the same way as the key: "Eggs" and "egg" are both "egg".
function plainAllergen(written: string): string {
  const word = fold(written)
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z ]/g, "")
    .trim();
  if (word.includes("nut")) return "nut";
  if (word === "soy") return "soya";
  return word.replace(/s$/, "");
}

function allergensOn(labelText: string): string[] {
  const contains = fieldOf(labelText, "contains") ?? "";
  const names = contains
    .split(/,|\band\b/)
    .map(plainAllergen)
    .filter(Boolean);
  return [...new Set(names)].sort();
}

function rightAllergens(folder: string, slug: string): boolean {
  const wanted = PRODUCTS[slug].allergens.map(plainAllergen).sort();
  return allergensOn(label(folder, slug)).join() === wanted.join();
}

function rightPrice(folder: string, slug: string): boolean {
  const priceText = fieldOf(label(folder, slug), "price") ?? "";
  const pounds = Number(priceText.match(/£\s*(\d+(?:\.\d{1,2})?)/)?.[1]);
  const row = PRICE_ROWS.find((candidate) => candidate.product === PRODUCTS[slug].name);
  return row !== undefined && Math.abs(pounds - row.shop_price) < 0.005;
}

export default [
  bakeryRule,
  {
    says: `${SKILL} is there`,
    test: (folder) => has(folder, SKILL),
    tryNext: "ask Claude to save the skill as .claude/skills/allergen-label/SKILL.md",
  },
  {
    says: "the skill has a name and a description that says when to use it for labels",
    test: (folder) => {
      const hasName = frontmatterField(folder, "name") !== "";
      return hasName && fold(frontmatterField(folder, "description")).includes("label");
    },
    tryNext: "ask Claude to start the skill with name: and description: lines between --- lines",
  },
  {
    says: "the skill has a Steps part and a Never part",
    test: (folder) => {
      const body = skill(folder);
      return section(body, "steps") !== undefined && section(body, "never") !== undefined;
    },
    tryNext: 'ask Claude to add the headings "## Steps" and "## Never" to the skill',
  },
  {
    says: `there is a label for each of the ${SLUGS.length} recipes in ${LABELS}/`,
    test: (folder) => SLUGS.every((slug) => has(folder, `${LABELS}/${slug}.md`)),
    tryNext: "ask Claude to run the skill for every recipe, named like recipes/, in out/labels/",
  },
  {
    says: "each label lists exactly the allergens in its recipe",
    test: (folder) => SLUGS.every((slug) => rightAllergens(folder, slug)),
    tryNext:
      'ask Claude to read each recipe again and fill "Contains:" from allergens/allergen-list.csv',
  },
  {
    says: "each label shows the shop price from the clean price list",
    test: (folder) => SLUGS.every((slug) => rightPrice(folder, slug)),
    tryNext: 'ask Claude to take each "Price:" from out/price-list-clean.xlsx, not the menu',
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "new labels go in out/labels/; run bun run world status, then bun run world reset",
  },
] satisfies Rule[];
