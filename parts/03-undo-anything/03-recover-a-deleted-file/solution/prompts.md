# How Claude made this answer

Claude Code deleted the notes with a command, then brought them back from the save point. You said yes to each command.

## The prompts you type

```text
This is a practice. I have a save point. Run this command:
rm notes/owner-notes.md
```

Then you type `/rewind` and see that it cannot help. Then:

```text
Bring back notes/owner-notes.md from the save point before-labels.
Do not write it again from memory. Then add this line to out/undo-log.md:
- owner-notes.md: a command (rm) deleted it. Rewind could not bring it
back, because Claude's file tools never touched it. I got it back from
the save point before-labels.
```

## What Claude showed

Before the `rm`, Claude said the house rules say "Never delete a file". You said it is a practice and you have a save point. Then it asked, and you said yes.

To bring the file back, Claude asked to run `git restore notes/owner-notes.md`. That copies the file out of the save point.

## What you checked before you said yes

- The restore command names only `notes/owner-notes.md`.
- Claude does not write the notes from memory.
- `bun run world status` says every original file is the same as the start.

## What you would say no to

- Claude offers to write the notes again from what it read before. Some words would change. Say no.
- Claude wants to run `git reset --hard`. That also throws away your new work. Say no.

Then run `bun run verify recover-a-deleted-file`. All 5 rules pass.
