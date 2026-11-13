// publish-the-menu-page: one web page with every product, its price from the clean price list,
// and every allergen in its recipe. It loads nothing from another site, so it works offline.
import type { Rule } from "../scripts/verify";
import { bakeryRule, has, KEY, originalsUnchanged, text } from "./lib/bakery";
import { fold } from "./lib/md";

const PAGE = "out/site/index.html";

type Product = { name: string; price: number; allergens: string[] };
type Found = { name: string; start: number; end: number };

// Every product with its clean shop price and the allergens its recipe holds.
export function products(): Product[] {
  const labels = Object.values(KEY.labels) as { name: string; allergens: string[] }[];
  // biome-ignore lint/style/useNamingConvention: the answer key names this column shop_price.
  const prices = KEY.prices.clean as { product: string; shop_price: number }[];
  return prices.map((row) => {
    const label = labels.find((candidate) => candidate.name === row.product);
    return { name: row.product, price: row.shop_price, allergens: label?.allergens ?? [] };
  });
}

// The words a person sees on the page: tags taken out, spaces tidied, lower case.
function pageWords(html: string): string {
  const withoutStyle = html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ");
  const withoutTags = withoutStyle.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
  return fold(withoutTags.replace(/&pound;/g, "£").replace(/\s+/g, " "));
}

// Where each product name sits in the words. "Croissant" inside "Almond Croissant" does not count.
function findNames(words: string): Found[] {
  const found: Found[] = [];
  for (const product of products()) {
    const name = fold(product.name);
    let start = words.indexOf(name);
    while (start >= 0) {
      found.push({ name: product.name, start, end: start + name.length });
      start = words.indexOf(name, start + 1);
    }
  }
  const insideLonger = (place: Found) =>
    found.some((other) => other !== place && other.start <= place.start && other.end >= place.end);
  const kept = found.filter((place) => !insideLonger(place));
  return kept.sort((first, second) => first.start - second.start);
}

// The words that belong to each product: from its name up to the next product's name.
export function productParts(html: string): Map<string, string> {
  const words = pageWords(html);
  const places = findNames(words);
  const parts = new Map<string, string>();
  places.forEach((place, i) => {
    const nextStart = places[i + 1]?.start ?? words.length;
    if (!parts.has(place.name)) parts.set(place.name, words.slice(place.start, nextStart));
  });
  return parts;
}

const page = (folder: string) => text(folder, PAGE);

function everyProduct(folder: string, test: (product: Product, words: string) => boolean) {
  const parts = productParts(page(folder));
  return products().every((product) => test(product, parts.get(product.name) ?? ""));
}

const showsPrice = (product: Product, words: string) => words.includes(product.price.toFixed(2));

const showsAllergens = (product: Product, words: string) =>
  product.allergens.every((allergen) => words.includes(allergen));

// A script, style sheet, picture or font from another site breaks the page offline.
export function loadsFromAnotherSite(html: string): boolean {
  const withoutLinks = html.replace(/<a\s[^>]*>/gi, " ");
  const fromOutside = /(src|href)\s*=\s*["']?(https?:)?\/\/|url\(\s*["']?(https?:)?\/\//i;
  return fromOutside.test(withoutLinks) || /@import/i.test(withoutLinks);
}

export default [
  bakeryRule,
  {
    says: `${PAGE} is there`,
    test: (folder) => has(folder, PAGE),
    tryNext: "ask Claude to write the menu page as out/site/index.html",
  },
  {
    says: `it shows all ${products().length} products`,
    test: (folder) => productParts(page(folder)).size === products().length,
    tryNext: "ask Claude to show every product on out/price-list-clean.xlsx",
  },
  {
    says: "each product shows its price from the clean price list",
    test: (folder) => everyProduct(folder, showsPrice),
    tryNext: "ask Claude to take prices from out/price-list-clean.xlsx, not from menu/menu.md",
  },
  {
    says: "each product shows every allergen in its recipe",
    test: (folder) => everyProduct(folder, showsAllergens),
    tryNext: "ask Claude to take allergens from the new labels in out/labels/, not the old ones",
  },
  {
    says: "it loads nothing from another site, so it works offline",
    test: (folder) => !loadsFromAnotherSite(page(folder)),
    tryNext: "ask Claude to put all the style inside the page, with no script or font from the web",
  },
  {
    says: "every original bakery file is the same as the start",
    test: originalsUnchanged,
    tryNext: "run bun run world status to see what changed, then bun run world reset",
  },
] satisfies Rule[];
