# How Claude made this answer

Claude Code makes the skill. Then the skill makes the report. You read both before you say yes.

## The prompt you type

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

## The plan Claude showed

Claude showed the whole `SKILL.md`. It had `name: monday-report` and a description between two `---` lines. Then Steps, then Never. You said yes.

Then you typed `/exit`, `claude`, and `/monday-report`.

## What you checked before you said yes

- Claude asked to use `till_totals`. You said yes. The till said £13,609.80 taken, 4558 sold, 392 wasted, and Focaccia had the most waste (39).
- The report Claude showed had those same numbers. Nothing was rounded.
- Under Late payers it named Kettle and Crumb and Moss and Grain. Those are the cafes in Jess's notes.

## What you would say no to

- The report says "about £13,600". Say no. Ask for the exact number from the till.
- Late payers lists all six cafes. Say no. Only two pay late.
- Claude writes the report but skips the skill. Say no. Next time you want one word, `/monday-report`, not a long prompt.

Then run `bun run verify write-the-monday-report`. All 10 rules pass.
