---
name: monday-report
description: >-
  Write the Monday report for Wren Street Bakery from the till.
  Use when asked for the Monday report, sales, waste or who pays late.
---

# The Monday report

## Steps

1. Use the till connector (till_totals), or add up till/sales.csv with a script.
   Never add up in your head.
2. Read notes/owner-notes.md for the cafes that pay late.
3. Run the date command for the time now. Save the report as a new file, out/reports/monday-report-<YYYY-MM-DD-HHMM>.md. Never write over an old report.
4. Start the report with "Made at: <YYYY-MM-DD HH:MM>". Then write a two sentence summary, then "## Sales", "## Waste" and "## Late payers".

## Never

- Never guess or round a number. Every number comes from the till.
- Never change till/sales.csv.
