# Assignment: find the unmatched invoices with DuckDB

This is optional in the live session and expected as homework. You need no code. Claude Code does the work.

## The task

Have Claude Code find the unmatched invoices with DuckDB. The starter folder has two CSV files and an empty `prompts.md`.

1. Open `assignment/starter` in Claude Code.
2. Ask Claude to use DuckDB 2.0.0 to list the invoices with no matching purchase order line.
3. Ask it to save the query as `unmatched.sql`.
4. Write the prompts you used in `prompts.md`.

```bash
bun run assignment
```

Expect: `2 of 2 lines pass. Wrote assignment/result.json`

## Done when

- The saved query runs with DuckDB 2.0.0.
- The mismatch count matches the answer key.

The check writes one `pass` or `fail` for each line, and the DuckDB version it found, to `assignment/result.json`.

## Rubric

A person reads `prompts.md` and asks one question:

- Do the prompts say what "matched" means in plain words?

## Hand it in

Push a branch named `assignment` and send its URL. The grader runs the same check.
