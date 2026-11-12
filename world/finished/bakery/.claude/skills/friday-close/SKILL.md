---
name: friday-close
description: Run the Friday close for Wren Street Bakery. Use when asked to do the close, or to clean the orders, fix the price list, check the invoices, make the labels, write the report and update the menu page in one go.
---

# The Friday close

Do these jobs in order. Each one writes new files in out/ and changes no original file.
Read CLAUDE.md and notes/owner-notes.md first.

## Steps

1. **Say what is here.** Write out/whats-here.md: one line for each top-level folder (orders, customers, prices,
   invoices, purchase-orders, recipes, allergens, labels, menu, till, notes, out) saying what it holds. End with a
   heading "## Questions I have" and at least two questions as dash lines.
2. **Clean the orders.** Read orders/wholesale-orders.csv. Write out/orders-clean.csv with exactly the columns
   order_id, order_date, cafe, product, quantity. Dates as YYYY-MM-DD (phone orders are day first). Cafe names
   exactly as in customers/cafes.csv. Quantities as whole numbers. Drop a row only when it is an exact copy of
   another row.
3. **Fix the price list.** Read prices/price-list.xlsx. Product names must match the first line of each recipe.
   Every price in pounds, as a number, for one item (unit "each"). Write out/price-list-clean.xlsx with the
   columns product, unit, shop_price, wholesale_price, and out/price-changes.md with one dash line for each
   product you changed and no others.
4. **Check the invoices.** Compare every PDF in invoices/ with purchase-orders/purchase-orders.csv. Write
   out/reconciliation.csv with the columns invoice, po, status, reason, one row for every invoice. Status is "ok"
   when it matches. Otherwise use "duplicate", "price above PO" or "short delivery". Then write
   out/reconciliation-note.md: what needs action, in under 150 words.
5. **Make the labels.** Use the allergen-label skill for every recipe.
6. **Write the report.** Use the monday-report skill.
7. **Update the menu page.** Write out/site/index.html: every product on the clean price list, its shop price
   and its allergens from its label. One file, no script from another site, readable on a phone.

## Never

- Never change, move or delete an original file.
- Never sign a label. A person does that.
- Never guess a number. Every number comes from a file in this folder.

When you finish, list each file you made.
