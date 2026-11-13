# How Claude made this answer

Claude Code wrote the plan. You read it, asked for changes, and said yes. This answer comes from a real Claude Code run. We made the words a little plainer.

## The prompts you type

In Plan mode:

```text
We will check the 24 supplier invoices in invoices/ against
purchase-orders/purchase-orders.csv. Do not do the check yet.
Make a plan with these headings: Goal, Files I will read,
Files I will write, Steps, Risks. Say which file is the source of truth.
```

After you say yes to the plan:

```text
Save the plan you showed me as out/plans/invoice-check.md.
Do not start the check.
```

## The plan Claude showed

Claude read the list of files, the first line of the purchase orders, and one bill. Then it showed the plan you see in `out/plans/invoice-check.md`. It saw something on its own: there are 24 bills but only 23 orders. So one bill may be a copy.

In the real run, Claude first named the files `out/invoice-check.csv` and `out/invoice-check.md`. You asked for `out/reconciliation.csv` and `out/reconciliation-note.md`, because the next step checks those names.

## What you checked before you said yes

- The source of truth is `purchase-orders.csv`.
- Every file it will write is in `out/`.
- It will flag a gap. It will never change an order to fit a bill.
- No file changed while it planned.

## What you would say no to

- "I fix the price on any order that does not match its bill." That changes the record. Say no.
- A plan with no Risks part. Ask Claude what could go wrong.
- Claude starts the check before you said yes. Say no, and switch back to Plan mode.

Then run `bun run verify plan-the-invoice-check`. All 6 rules pass.
