# Plan: check the supplier bills against the purchase orders

This is a plan only. The check has not been done yet.

## Goal

Check each of the 24 bills in `invoices/` against its line in `purchase-orders/purchase-orders.csv`. Flag a bill when the price, the amount or the order is wrong. Give Jess a short list of what to ask each supplier.

The bills are the truth. They say what the supplier really sent. When a bill and an order do not match, the order gets fixed to fit the bill.

## Files I will read

- `purchase-orders/purchase-orders.csv`: read only. It has 23 orders, from PO-3001.
- `invoices/*.pdf`: 24 bills, read only.
  - Fellside Dairy: FD-2201 to FD-2207 (7)
  - Hollow Lane Eggs: HL-870 to HL-875 (6)
  - Kraftline Packaging: KP-15020 to KP-15024 (5)
  - Millbrook Mill: MM-4410 to MM-4415 (6)
- `CLAUDE.md`: the house rules for money, dates and where files go.

## Files I will write

All new files go in `out/`. No other file is made, changed or deleted.

- `out/reconciliation.csv`: one row for each bill, with the columns invoice, po, status, reason.
- `out/reconciliation-note.md`: a short note for Jess. The bills that need action come first.

## Steps

1. Read the purchase orders and find each one by its number.
2. Read the text of each bill: the supplier, the bill number, the order number, the item, the amount, the unit price and the total.
3. Match each bill to its order by the order number on the bill.
4. Compare the unit price with `agreed_price`. Any gap gets a flag.
5. Compare the amount billed with the amount ordered.
6. Look for two bills on the same order. There are 24 bills and only 23 orders, so expect one.
7. Give each bill one status: `ok`, `duplicate`, `price above PO` or `short delivery`.
8. Write the two files. Money as £6.20. Dates as YYYY-MM-DD.
9. Read both files again and check a few flagged rows against the PDFs.

## Risks

- A bill may be hard to read. I mark it "needs a look" and do not guess.
- 24 bills and 23 orders: one bill may be a copy. I flag it and let Jess decide.
- A lower amount may be a real part delivery. I flag it and let Jess decide.
- A price can look wrong when the units differ, like kg and bags. I check the unit first.
- Nobody gets an email unless Jess says so.
