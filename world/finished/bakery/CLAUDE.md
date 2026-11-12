# Wren Street Bakery

## About the bakery

A family bakery with one shop. We bake bread and pastries and deliver to six cafes. Jess owns it.

## Where things live

- Orders are in orders/. The right cafe names are in customers/cafes.csv.
- Prices are in prices/price-list.xlsx. Invoices are PDFs in invoices/. What we ordered is in purchase-orders/.
- Recipes are in recipes/. The allergen words we look for are in allergens/allergen-list.csv.
- What sold is in till/sales.csv. Jess's notes are in notes/owner-notes.md.
- Put every new file in out/. Put any script you write in out/scripts/.

## Never do

- Never delete a file.
- Never change an original file. Make a new file in out/ instead.
- Never change anything in till/ or purchase-orders/. They are the record.
- Never email a cafe.

## Money rules

- Prices are in pounds with two decimals, like £2.80.
- The purchase order is the truth. An invoice that does not match it gets a flag.

## Tools

- There is no Excel here. To read or write a .xlsx file, write a short script in out/scripts/ and run it with bun.
  The course folder that holds this bakery folder has checks/lib/xlsx.ts, with readXlsx and writeXlsx. Import it.

## How to write

Short and friendly. Dates as YYYY-MM-DD. Sign off "Jess at Wren Street".
