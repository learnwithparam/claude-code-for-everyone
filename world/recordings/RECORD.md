# Recordings of the real Claude Code

Every recording here is a real `claude -p` run, made with Claude Code signed in to a Claude account. Nobody writes
or edits a transcript by hand. When there is no signed-in `claude`, or in CI, `bun run finished` replays one of
these runs and says so in its first line.

## What a recording holds

| File | What it is |
|---|---|
| `close-N/transcript.jsonl` | The stream-json events of the run, one per line |
| `close-N/files/` | Every file the run made or changed in the bakery folder |
| `close-N/run.json` | The Claude Code version, the exact command, the exit code and how long it took |

Before a transcript is saved, `scrub()` in `world/finished.ts` takes out what is private or names a model: the
model id, token usage and cost, rate limit events, paths on the recording machine and any email address. It keeps
every message, tool call and tool result. Nothing else is changed.

## The runs

Behaviour that varies from run to run is judged over 3 runs: `tests/claude-code.test.ts` replays each one on a
fresh bakery and runs every step's check on what Claude made.

| Recording | Command, from the course folder | Folder it runs in | Where the output goes |
|---|---|---|---|
| `close-1` | `bun run finished --record 1` | `finished/wren-street/`, a fresh copy of `world/seed/wren-street/` plus `world/finished/bakery/` | `world/recordings/close-1/` |
| `close-2` | `bun run finished --record 2` | the same, made fresh again | `world/recordings/close-2/` |
| `close-3` | `bun run finished --record 3` | the same, made fresh again | `world/recordings/close-3/` |

Each command runs, inside the bakery folder:

```text
claude -p "Run the Friday close with the friday-close skill. Work only in this folder." \
  --output-format stream-json --verbose --permission-mode acceptEdits \
  --allowedTools Read Glob Grep Write Edit Skill "Bash(bun *)" "Bash(ls *)" "Bash(mkdir *)" \
  --max-turns 120
```

The flags live in `config/claude.ts`. The prompt lives in `world/finished/prompt.txt`.

## When to record again

Record all 3 again, with Claude Code signed in, when any of these change: `world/finished/bakery/`, the prompt,
the flags in `config/claude.ts`, the seed in `world/seed/`, or a check that a recording now fails. Then run
`bun test`. If a run fails a check, keep it out and record another; say in the commit which run failed and why.

## For the supervisor

If a session could not record (no signed-in `claude` where it worked), it lists the runs it needs in the table
above with the status `to record`. Run each command from the course folder on a machine where `bun run doctor`
prints `Ready.`, then commit `world/recordings/`.
