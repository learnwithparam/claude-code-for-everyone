# How Claude made this answer

Claude Code reads your clean files and writes one page. You read the plan and the page before you say yes.

## The prompt you type

```text
Make out/site/index.html: one menu page for Wren Street Bakery.
Show every product on out/price-list-clean.xlsx with its shop price.
Under each product, show "Contains:" and its allergens from its label
in out/labels/. Put all the style inside the page. Load nothing from
another site. Make it easy to read on a phone.
```

## The plan Claude showed

1. Read `out/price-list-clean.xlsx` with a short script, for the 12 products and their shop prices.
2. Read each label in `out/labels/` for its "Contains:" line.
3. Write one page with the style inside it.

You checked that the plan named `out/labels/`, not `labels/`. You said yes.

## What you checked before you said yes

- The Sourdough Loaf shows £4.20, from the clean list. The old menu said £4.00.
- The Multigrain Loaf shows "Contains: gluten, sesame, soya".
- There is no `<link>` or `<script>` that starts with `http`.

Then you opened the page in your browser, at phone width.

## What you would say no to

- Claude reads prices from `menu/menu.md`. Say no. Those are the old prices.
- Claude adds a font from Google Fonts. Say no. The page must work offline.
- Claude copies "Contains" from the old `labels/` folder. Say no. It misses sesame.

Then run `bun run verify publish-the-menu-page`. All 7 rules pass.
