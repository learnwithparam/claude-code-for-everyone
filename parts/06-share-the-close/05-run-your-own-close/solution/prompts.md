# How Claude made this answer

Claude Code worked inside `my-close/`, on a copy of your files. You typed three prompts and checked each result before you said yes. The files here are made-up practice files, like yours should be.

## The prompts you type

```text
Read the files in input/. Write CLAUDE.md here with a "## Never" heading
and a rule that stops you changing anything in input/. Then do my task
from ../out/friday-close.md. Save every result in out/.
```

```text
Write out/run-log.md with four headings: "## What I asked", "## Files I used",
"## What Claude made" and "## How I checked". List files with a dash.
```

Under "How I checked", Claude put your own words: which result you opened and what you found.

## What you checked before you said yes

- `CLAUDE.md` says never to change a file in `input/`.
- Claude only wrote inside `out/`.
- You opened `matches.csv` and compared one line with the order it names.

## What you would say no to

- Claude edits a file in `input/`. Say no. The copy is for reading.
- Claude lists a file in the log that it never made. Say no.

Then run `bun run verify run-your-own-close`. All 8 rules pass.
