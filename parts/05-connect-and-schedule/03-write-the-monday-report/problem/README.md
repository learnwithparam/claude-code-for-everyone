# Write the Monday report

## The problem

Jess reads the Monday report before the shop opens. It says what the shop took, what was thrown away, and which cafes pay late. Today she adds it up with a pen.

A number Claude works out in its head can be wrong, and it looks just as sure. So the numbers must come from the till, in the same shape every time. A skill does both.

```mermaid
flowchart LR
  K[/monday-report/] --> S[The skill's Steps]
  S --> T[The till connector]
  S --> N[notes/owner-notes.md]
  T --> R[out/reports/monday-report.md]
  N --> R
```

## Your challenge

Ask Claude to make a `monday-report` skill. Run it once, then add a checker.

1. Start `claude` in `wren-street`. Paste this:

```text
Make a skill at .claude/skills/monday-report/SKILL.md, named
monday-report. Its description says: use it when asked for the
Monday report. Steps: get the totals from the till connector. Read
notes/owner-notes.md for the cafes that pay late. Write
out/reports/monday-report.md: two short sentences, then "## Sales"
(takings and items sold), "## Waste" (items wasted and the most
wasted product), and "## Late payers" (one line per cafe).
Add "## Never": never guess a number, never change the till.
```

2. Read the skill. Check that it has Steps and Never.
3. Type `/exit`, then `claude` again, to load the skill.
4. Type `/monday-report`. Say yes to the till tools. Read the report first.

5. Now add a checker. A **subagent** is a helper with its own chat and tools. Paste this:

```text
Make a subagent at .claude/agents/numbers-checker.md with only the
tools Read, Grep and Glob. It checks a report against till/sales.csv.
Run it on out/reports/monday-report.md. Save its answer in
out/numbers-check.md as a dash list that ends with a verdict.
```

For example, the report has a part like this. The cafes come from Jess's notes:

```text
## Late payers

- Kettle and Crumb
- Moss and Grain
```

## Done when

- The skill has `name: monday-report`, a description that says report, and Steps and Never parts.
- `out/reports/` has a report with Sales, Waste and Late payers.
- The takings, items sold, items wasted and most wasted product match the till.
- The late payers are the two cafes in Jess's notes.
- The checker can only read files, and `out/numbers-check.md` says the report matches.
- No original file has changed.

To check, ask Claude:

```text
Please check my work for write-the-monday-report. Run bun run verify write-the-monday-report and tell me what it printed. Do not change anything to make it pass.
```

It runs:

```bash
bun run verify write-the-monday-report
```

Expect: `Done. All 12 rules pass.`

![The check passes](../images/expected.png)

## If you get stuck

| What you see                              | Try this                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `/monday-report` is not in the list       | Type `/exit`, then `claude` again. Check the file is named `SKILL.md`. |
| `FAIL  the takings and items sold match`  | Ask the skill to use the till connector, not a guess.                  |
| `FAIL  the late payers are the cafes`     | Ask the skill to read the Cafes part of `notes/owner-notes.md`.        |
| `FAIL  there is a report in out/reports/` | Check the skill writes to `out/reports/monday-report.md`.              |

## Words you will use

- **Subagent**: a helper Claude starts for one job. It works in its own chat, with only the tools you give it.
- **Skill**: a saved set of steps Claude follows the same way each time.
- **Description**: one line that tells Claude when to use the skill.
- **Takings**: the money the shop took from sales.
