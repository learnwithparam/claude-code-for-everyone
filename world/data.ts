// The facts of Wren Street Bakery. The generator in build.ts makes the bakery folder from these.
// The answer key comes from the same facts,
// so every planted fault is known before a learner starts.

export type Product = {
  slug: string;
  name: string;
  shop: number; // pounds, each
  wholesale: number; // pounds, each
  ingredients: string[];
  allergens: string[]; // what the recipe holds today
  labelAllergens: string[]; // what the old label in labels/ says
  method: string;
};

export const PRODUCTS: Product[] = [
  {
    slug: "sourdough-loaf",
    name: "Sourdough Loaf",
    shop: 4.2,
    wholesale: 2.8,
    ingredients: ["wheat flour", "water", "sea salt", "sourdough starter (wheat flour, water)"],
    allergens: ["gluten"],
    labelAllergens: ["gluten"],
    method: "Mix, rest, fold four times, shape, prove cold, bake hot with steam.",
  },
  {
    slug: "seeded-rye-loaf",
    name: "Seeded Rye Loaf",
    shop: 4.5,
    wholesale: 3.0,
    ingredients: ["rye flour", "wheat flour", "sunflower seeds", "linseed", "water", "sea salt"],
    allergens: ["gluten"],
    labelAllergens: ["gluten"],
    method: "Soak the seeds, mix a wet dough, fill the tins, prove, bake low and long.",
  },
  {
    slug: "white-tin-loaf",
    name: "White Tin Loaf",
    shop: 2.9,
    wholesale: 1.85,
    ingredients: ["wheat flour", "water", "milk powder", "butter", "yeast", "salt"],
    allergens: ["gluten", "milk"],
    labelAllergens: ["gluten", "milk"],
    method: "Mix, knead, rise, shape into tins, rise again, bake.",
  },
  {
    slug: "multigrain-loaf",
    name: "Multigrain Loaf",
    shop: 4.0,
    wholesale: 2.65,
    ingredients: ["wheat flour", "oats", "soya flour", "sesame seeds", "water", "yeast", "salt"],
    allergens: ["gluten", "soya", "sesame"],
    labelAllergens: ["gluten", "soya"],
    method: "Mix, rise, shape, roll the top in sesame seeds, bake.",
  },
  {
    slug: "croissant",
    name: "Croissant",
    shop: 1.9,
    wholesale: 1.1,
    ingredients: ["wheat flour", "butter", "milk", "sugar", "yeast", "salt", "egg (glaze)"],
    allergens: ["gluten", "milk", "eggs"],
    labelAllergens: ["gluten", "milk", "eggs"],
    method: "Laminate the dough with butter, three folds, cut, roll, prove, glaze, bake.",
  },
  {
    slug: "pain-au-chocolat",
    name: "Pain au Chocolat",
    shop: 2.1,
    wholesale: 1.25,
    ingredients: [
      "wheat flour",
      "butter",
      "milk",
      "dark chocolate (cocoa, sugar, soya lecithin)",
      "egg (glaze)",
    ],
    allergens: ["gluten", "milk", "eggs", "soya"],
    labelAllergens: ["gluten", "milk", "eggs", "soya"],
    method: "Laminate, cut, roll around two chocolate sticks, prove, glaze, bake.",
  },
  {
    slug: "almond-croissant",
    name: "Almond Croissant",
    shop: 2.6,
    wholesale: 1.6,
    ingredients: ["croissant (wheat flour, butter, milk, egg)", "almonds", "sugar", "egg"],
    allergens: ["gluten", "milk", "eggs", "nuts"],
    labelAllergens: ["gluten", "milk", "eggs", "nuts"],
    method: "Split yesterday's croissants, fill with almond cream, top with flaked almonds, bake.",
  },
  {
    slug: "cinnamon-bun",
    name: "Cinnamon Bun",
    shop: 2.8,
    wholesale: 1.7,
    ingredients: ["wheat flour", "butter", "milk", "egg", "sugar", "cinnamon", "yeast"],
    allergens: ["gluten", "milk", "eggs"],
    labelAllergens: ["gluten", "milk", "eggs"],
    method: "Roll out, spread cinnamon butter, roll up, cut, prove, bake, glaze.",
  },
  {
    slug: "brownie",
    name: "Brownie",
    shop: 2.75,
    wholesale: 1.65,
    ingredients: [
      "butter",
      "egg",
      "sugar",
      "dark chocolate (cocoa, sugar, soya lecithin)",
      "wheat flour",
      "walnuts",
    ],
    allergens: ["gluten", "milk", "eggs", "soya", "nuts"],
    labelAllergens: ["gluten", "milk", "eggs", "soya", "nuts"],
    method: "Melt chocolate and butter, whisk eggs and sugar, fold in flour and walnuts, bake.",
  },
  {
    slug: "fruit-scone",
    name: "Fruit Scone",
    shop: 2.2,
    wholesale: 1.2,
    ingredients: ["wheat flour", "butter", "milk", "egg", "sultanas", "sugar", "baking powder"],
    allergens: ["gluten", "milk", "eggs"],
    labelAllergens: ["gluten", "milk", "eggs"],
    method: "Rub butter into flour, add fruit, bind with milk and egg, cut, bake.",
  },
  {
    slug: "cheese-scone",
    name: "Cheese Scone",
    shop: 2.4,
    wholesale: 1.35,
    ingredients: ["wheat flour", "butter", "milk", "cheddar cheese", "egg", "mustard powder"],
    allergens: ["gluten", "milk", "eggs", "mustard"],
    labelAllergens: ["gluten", "milk", "eggs", "mustard"],
    method: "Rub butter into flour, add cheese and mustard, bind, cut, bake.",
  },
  {
    slug: "focaccia",
    name: "Focaccia",
    shop: 3.6,
    wholesale: 2.3,
    ingredients: ["wheat flour", "water", "olive oil", "rosemary", "sea salt", "yeast"],
    allergens: ["gluten"],
    labelAllergens: ["gluten"],
    method: "Mix a wet dough, fold, spread in oiled trays, dimple, top with rosemary, bake.",
  },
];

// The bakery's own allergen words. Not a legal list: it names only what these recipes use.
export const ALLERGEN_WORDS: { allergen: string; lookFor: string }[] = [
  { allergen: "gluten", lookFor: "wheat flour; rye flour; oats" },
  { allergen: "milk", lookFor: "milk; milk powder; butter; cheddar cheese" },
  { allergen: "eggs", lookFor: "egg" },
  { allergen: "nuts", lookFor: "almonds; walnuts" },
  { allergen: "sesame", lookFor: "sesame seeds" },
  { allergen: "soya", lookFor: "soya flour; soya lecithin" },
  { allergen: "mustard", lookFor: "mustard powder" },
];

export type Cafe = {
  account: string;
  name: string;
  area: string;
  payDays: number;
  spellings: string[];
};

// The first spelling is the right one. The others are how the three order sources typed it.
export const CAFES: Cafe[] = [
  {
    account: "C01",
    name: "Lumen Cafe",
    area: "Riverside",
    payDays: 14,
    spellings: ["Lumen Cafe", "lumen cafe", "LUMEN CAFE", "Lumen Café"],
  },
  {
    account: "C02",
    name: "Kettle and Crumb",
    area: "Old Town",
    payDays: 30,
    spellings: ["Kettle and Crumb", "Kettle & Crumb"],
  },
  {
    account: "C03",
    name: "Hartley Corner Cafe",
    area: "Hartley Road",
    payDays: 14,
    spellings: ["Hartley Corner Cafe", "Hartley Corner"],
  },
  {
    account: "C04",
    name: "Bluebell Coffee",
    area: "Market Square",
    payDays: 7,
    spellings: ["Bluebell Coffee", "Bluebell Coffee "],
  },
  {
    account: "C05",
    name: "Moss and Grain",
    area: "Canal Side",
    payDays: 30,
    spellings: ["Moss and Grain", "Moss & Grain"],
  },
  {
    account: "C06",
    name: "Pier Nine Espresso",
    area: "Harbour Walk",
    payDays: 14,
    spellings: ["Pier Nine Espresso"],
  },
];

// What cafes order. Wholesale products only.
export const WHOLESALE = [
  "sourdough-loaf",
  "seeded-rye-loaf",
  "white-tin-loaf",
  "multigrain-loaf",
  "croissant",
  "pain-au-chocolat",
  "almond-croissant",
  "cinnamon-bun",
  "brownie",
  "fruit-scone",
  "cheese-scone",
  "focaccia",
];

// Quantities the phone and email orders wrote as words.
export const QTY_WORDS: Record<number, string> = {
  6: "six",
  10: "ten",
  12: "a dozen",
  18: "eighteen",
  24: "two dozen",
  36: "three dozen",
};

// The three price list faults.
export const PRICE_FAULTS = {
  pence: { slug: "cinnamon-bun", wrongShop: 280 }, // 280 pence typed into a pounds column
  typo: { slug: "croissant", wrongName: "Crossiant" },
  unit: { slug: "fruit-scone", unit: "dozen" }, // priced per dozen, every other row is each
};

// The menu on the shop wall disagrees with the price list on two products.
export const MENU_WRONG: Record<string, number> = { "sourdough-loaf": 4.0, brownie: 2.5 };

// What the bakery buys. Each supplier numbers its own invoices, starting from firstInvoiceNumber.
export const SUPPLIERS = [
  {
    code: "MM",
    ordersPerQuarter: 6,
    firstInvoiceNumber: 4410,
    name: "Millbrook Mill",
    item: "strong white flour",
    unit: "kg",
    price: 0.92,
    quantities: [400, 500],
  },
  {
    code: "FD",
    ordersPerQuarter: 6,
    firstInvoiceNumber: 2201,
    name: "Fellside Dairy",
    item: "unsalted butter",
    unit: "kg",
    price: 6.2,
    quantities: [60, 80],
  },
  {
    code: "HL",
    ordersPerQuarter: 6,
    firstInvoiceNumber: 870,
    name: "Hollow Lane Eggs",
    item: "free range eggs",
    unit: "egg",
    price: 0.24,
    quantities: [360, 480],
  },
  {
    code: "KP",
    ordersPerQuarter: 5,
    firstInvoiceNumber: 15020,
    name: "Kraftline Packaging",
    item: "paper bread bags",
    unit: "bag",
    price: 0.06,
    quantities: [2000, 3000],
  },
];
