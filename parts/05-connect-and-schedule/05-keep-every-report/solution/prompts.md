# How Claude made this answer

You ask Claude to change the skill. Then you run the skill two times, a few minutes apart.

## The prompt you type

```text
Change the monday-report skill. Each run saves a new file named
out/reports/monday-report-YYYY-MM-DD-HHMM.md, with the time from the
date command. Never write over an old report. Start each report
with the line "Made at: YYYY-MM-DD HH:MM".
```

## What you checked before you said yes

- The new Steps ran the date command and saved a file with the time in its name.
- The second run made a new file. The first one stayed.
- Both reports had the same numbers as the till.

## What you would say no to

- The skill saves to the same file name each time. Say no. That writes over the last report.
- You copy a report by hand to get two. Say no. Let the skill make each one.

Then run `bun run verify keep-every-report`. All 8 rules pass.
