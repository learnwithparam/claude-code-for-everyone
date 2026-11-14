# How Claude made this answer

This answer took way 2, Run now. Way 1 is the same, but the app makes the second report on its own clock.

## The prompts you type

```text
Change the monday-report skill. Each run saves a new file named
out/reports/monday-report-YYYY-MM-DD-HHMM.md, with the time from the
date command. Never write over an old report. Start each report
with the line "Made at: YYYY-MM-DD HH:MM".
```

Then `/monday-report`, and a few minutes later `/monday-report` again.

```text
Make out/schedule.md. Under "## Schedule", write the cron line I would
use, in numbers only. Under "## Why I read the first run", write one
sentence on why I read the first report before it runs alone.
```

## The plan Claude showed

For the skill, Claude showed the new Steps: run `date`, save a new file with the time in its name, and start with `Made at:`. You said yes.

Each run asked to use the till tools and to run `date`. Then it asked to write a new file. The names ended in `0700` and `0703`. The old file stayed.

## What you checked before you said yes

- The second run made a new file. It did not write over the first one.
- Both reports had the same numbers as the till: £13,609.80, 4558 sold, 392 wasted.
- The cron line was `0 7 * * 2`: numbers only, and it starts with one number, so it runs once, not every minute.

## What you would say no to

- The skill saves to `out/reports/monday-report.md` every time. Say no. That writes over the last report.
- The cron line says `TUE` or `MON`. Say no. The app takes numbers only.
- The cron line is `* * * * *`. Say no. That runs every minute.

Then run `bun run verify schedule-the-monday-report`. All 9 rules pass. The check says it passed the Run now way.
