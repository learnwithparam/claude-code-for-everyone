# How Claude made this answer

Claude Code cleans the sheet. You type prompts, read the list Claude shows, and steer it.

## The prompts you type

```text
Read orders/wholesale-orders.csv. Do not change it.
Make a clean copy at out/orders-clean.csv with the columns
order_id, order_date, cafe, product, quantity.
Before you start, tell me every problem you see in the file.
```

If Claude misses the phone dates, add this:

```text
Read notes/owner-notes.md. Phone orders are written day first.
Fix those dates too, and use the cafe names in customers/cafes.csv.
```

## The plan Claude showed

Before it made the file, Claude listed four kinds of problem:

- Dates are written in three ways. Phone orders put the day first.
- One cafe is spelled in more than one way. For example, "LUMEN CAFE" and "Lumen Cafe".
- Some rows are in the sheet twice.
- Some quantities are words, like "two dozen".

Then it asked before it made `out/orders-clean.csv`.

## What you checked before you said yes

- The list has all four kinds of problem.
- Claude makes a new file in `out/`. It does not change the original.
- It drops a row only when every cell is the same as another row.
- "two dozen" becomes 24.

## What you would say no to

- Claude wants to save over `orders/wholesale-orders.csv`. Say no.
- Claude drops every row with the same cafe and product. Those are real orders. Say no.
- Claude reads 03/08/2026 as the 8th of March. Say no. It is the 3rd of August.

Then run `bun run verify clean-the-orders`. All 10 rules pass.
