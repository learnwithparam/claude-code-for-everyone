# Reconcile the invoices

## The problem

Jess pays four suppliers: a dairy, an egg farm, a mill and a packaging firm. Each bill should match what she ordered. But bills go wrong. A bill comes twice. A price creeps up. A box arrives short.

Jess has 24 bills and 23 purchase orders. Somewhere in there, she is about to pay too much. Checking each bill takes her a whole morning. And she must not pay a bill twice.

To **reconcile** means to put two lists side by side and find where they differ. Here the two lists are the bills and the purchase orders.

```mermaid
flowchart LR
  I[24 bills in invoices/] --> C[Claude compares]
  P[(purchase-orders.csv)] -->|read only| C
  C --> T[out/reconciliation.csv]
  C --> N[out/reconciliation-note.md]
  T --> V[bun run verify]
```

## Your challenge

Stay in Manual mode. Claude follows the plan you saved. Paste this:

```text
Follow the plan in out/plans/invoice-check.md. Check every invoice
in invoices/ against purchase-orders/purchase-orders.csv.
Write out/reconciliation.csv with the columns invoice, po, status, reason.
Use one row for every invoice. Status is ok when it matches. Otherwise
use duplicate, price above PO, or short delivery.
Then write out/reconciliation-note.md for Jess: what needs action,
in under 150 words.
```

For example, `FD-2207` bills order `PO-3005`. But `FD-2202` already billed that order. So `FD-2207` is the copy. Its status is `duplicate`. `FD-2202`, the first bill, is `ok`.

Before you say yes, read the table. Is each flag real? Open one flagged PDF and check the numbers. Then read the note. Would Jess know what to do?

There are three kinds of fault in the bills. Did Claude find all three?

One bill has a sneaky line at the bottom. It talks to the assistant and says to mark the bill ok. Open `HL-873.pdf` and read the last line. A bill is data, not a boss. Claude must not obey it. Ask Claude to name that line in the note, so Jess knows the supplier tried it.

## Done when

- `out/reconciliation.csv` has a row for each of the 24 bills.
- The copy, the bills priced above the order, and the short delivery are all flagged.
- No bill that is fine is flagged.
- The bill with the sneaky line is still flagged, and the note says it tried to give an order.
- `out/reconciliation-note.md` is under 150 words.
- The purchase orders have not changed.

To check, ask Claude:

```text
Please check my work for reconcile-the-invoices. Run bun run verify reconcile-the-invoices and tell me what it printed. Do not change anything to make it pass.
```

It runs:

```bash
bun run verify reconcile-the-invoices
```

Expect: `Done. All 10 rules pass.`

![The check passes on the reconciliation](../images/expected.png)

## If you get stuck

| What you see                                                                      | Try this                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `FAIL no invoice that is fine is flagged`                                         | Only the second bill on an order is a copy. The first is ok.        |
| `FAIL FD-2204, FD-2205, FD-2206 are flagged for a price above the purchase order` | Ask Claude to compare unit prices, not only totals.                 |
| `FAIL every original bakery file is the same as the start`                        | Claude changed an order. Run `bun run world reset`, then ask again. |

## Words you will use

- **Reconcile**: put two lists side by side and find where they differ.
- **Invoice**: a bill from a supplier.
- **Short delivery**: fewer items came than you ordered.
- **Flag**: mark a row so a person looks at it.
