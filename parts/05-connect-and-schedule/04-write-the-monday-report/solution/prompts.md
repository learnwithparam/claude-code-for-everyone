# How Claude made this answer

Claude Code makes the checker. Then you run a second try in a worktree. You read each file before you say yes.

## The prompts you type

```text
Make a subagent at .claude/agents/numbers-checker.md with only the
tools Read, Grep and Glob. It checks a report against till/sales.csv.
Run it on out/reports/monday-report.md. Save its answer in
out/numbers-check.md as a dash list that ends with a verdict.
```

Then, in the terminal, you type this to start the second try:

```bash
claude -w second-try
```

Expect: Claude starts inside the folder `.claude/worktrees/second-try`.

Back in the bakery folder, you ask for the note:

```text
Make out/worktree.md. Under "## Worktree", write the worktree folder
and branch I just used. Add one line on what I ran there.
```

## What you checked before you said yes

- The checker's tools line was Read, Grep, Glob. It had no Write.
- The note ended with a verdict that the report matches the till.
- The worktree note named the folder `.claude/worktrees/second-try`.

## What you would say no to

- The checker can write files. Say no. A checker should only read.
- The note says the report matches, but the checker never ran. Say no.
- The worktree note names nothing. Say no. Write the folder or the branch.

Then run `bun run verify write-the-monday-report`. All 13 rules pass.
