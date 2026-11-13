# How Claude made this answer

Claude Code reads your sentence, asks you about your job, and writes the map. The words come from you.

## The prompt you type

```text
Read out/why-i-am-here.md. Make out/friday-close.md with four headings.
"## My task": my sentence, in my words.
"## Files it needs": each file the task reads, one per line with a dash.
"## First rule for its CLAUDE.md": the one rule Claude must never break.
"## One check a script could run": one yes or no test on a file.
Ask me questions first. Do not guess about my job.
```

## The questions Claude asked

1. Where do the delivery notes come from? You said: PDFs in a shared folder.
2. Where are the orders? You said: a CSV export of open orders.
3. What must never change? You said: an order. Only a person changes an order.

## What you checked before you said yes

- "My task" is your own sentence, about delivery notes and orders.
- The files are yours: `delivery-notes/*.pdf`, `orders/open-orders.csv`, `customers.csv`. They are made-up names, with no real data.
- The check is a yes or no test a script can run on `out/matches.csv`.

## What you would say no to

- Claude writes "Run the Friday close for the bakery" as your task. Say no. This map is for your own job.
- Claude writes "Claude checks it" as the check. Say no. A script must be able to run it.
- Claude puts a real customer name in the map. Say no. Use made-up names.

Then run `bun run verify map-your-own-close`. All 7 rules pass.
