# How Claude made this answer

This answer took the note way for the clock. The app can run it too, but the note works without the Scheduled button.

## The prompts you type

```text
Make out/schedule.md. Under "## Schedule", write the cron line I would
use, in a code block, in numbers only. Under "## Why I read the first
run", write one sentence on why I read the first report before it runs alone.
```

```text
Write run-report.sh in wren-street. One line runs claude with -p and
asks it to run the monday-report skill. Use --permission-mode
acceptEdits and --allowedTools for Skill, mcp__till, Bash(date), Read
and Write. Do not skip any permission check.
```

Then you run `bash run-report.sh`, and try a loop line in `claude`. You ask Claude to save it in `out/loop.md`.

## What you checked before you said yes

- The cron line was five numbers and started with one number, so it runs once, not every minute:

```text
0 7 * * 2
```

- The script had `-p`, the skill name, and no line that skips permission checks.
- The loop line had an interval, then the report it repeats.

## What you would say no to

- The cron line says TUE or MON. Say no. The app takes numbers only.
- The cron line runs every minute, like this:

```text
* * * * *
```

- The script says --dangerously-skip-permissions. Say no. Name what it may do with --allowedTools.
- The loop has no interval or nothing to repeat. Say no.

Then run `bun run verify schedule-the-monday-report`. All 12 rules pass.
