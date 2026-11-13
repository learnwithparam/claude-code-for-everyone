# How Claude made this answer

You typed three prompts into Claude Code, opened in the `assignment/starter` folder.

## The prompts you type

```text
There are two CSV files here: invoices.csv and purchase-orders.csv. Use DuckDB 2.0.0
to list the invoices that have no matching purchase order line. Save the query as
unmatched.sql in this folder.
```

```text
Say in plain words what "matched" means before you write the query.
```

```text
A bill is matched when it is the first bill for its purchase order, at the agreed
price, for the quantity ordered. Any other bill is not matched. Run the query and show me the rows.
```

## What you checked before you said yes

- The query only reads the two files. It does not write to them.
- It lists 5 bills: `FD-2207`, `FD-2204`, `FD-2205`, `FD-2206` and `HL-873`.
- These are the same bills you flagged in reconcile-the-invoices.
- `FD-2202` is not in the list. Only the second bill on an order is the copy.

## What you would say no to

- Claude lists `FD-2202` too. Then Jess pays neither copy. Say no.
- Claude compares only the totals. The butter bills would be missed. Say no.
