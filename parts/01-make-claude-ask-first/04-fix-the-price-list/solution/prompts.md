# How Claude made this answer

Claude Code makes both files. You type two prompts, read what Claude shows, and say yes or no.

## The prompts you type

```text
Read prices/price-list.xlsx. Do not change it. Compare each product
name with the first line of its recipe in recipes/.
Find what is wrong in the list, and tell me before you fix anything.
```

When you agree with the list of mistakes:

```text
Save the fixed list as out/price-list-clean.xlsx, with the same columns.
Prices must be numbers in pounds, for one item. Then write
out/price-changes.md with one line for each product you changed.
```

## The plan Claude showed

Claude found three mistakes:

- "Crossiant" should be "Croissant", like the recipe.
- The Cinnamon Bun shop price is 280. That is pence. It should be £2.80.
- The Fruit Scone row is priced for a dozen. Every other row is for one item.

Then it asked before it made `out/price-list-clean.xlsx` and `out/price-changes.md`.

## What you checked before you said yes

- There are three mistakes, no more.
- Prices are numbers, like 2.8, not text like "£2.80".
- The change list names Croissant, Cinnamon Bun and Fruit Scone, and nothing else.
- The original `prices/price-list.xlsx` stays the same.

## What you would say no to

- Claude changes the Sourdough Loaf price to match the menu on the wall. That price was right. Say no.
- Claude saves prices as text with a pound sign. Say no, and ask for numbers.

Then run `bun run verify fix-the-price-list`. All 9 rules pass.
