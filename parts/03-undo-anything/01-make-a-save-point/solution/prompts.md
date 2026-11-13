# How Claude made this answer

Claude Code made the save point with git. You typed one prompt and said yes to each command. The files in `.save-point/` show what git printed. The check reads them, because a course folder cannot hold a real save point inside it.

## The prompt you type

```text
Make this folder a git repository, so I can make save points.
Then make a save point of every file, called before-labels.
Keep out/ in the save point too. Tell me each command before you run it.
```

## What Claude did

Claude asked before each of these:

- `git init` makes the folder ready for save points.
- `git add -A` picks every file.
- `git commit -m "before-labels"` makes the save point.

Then you asked "What save points do I have?" Claude ran `git log` and showed one line: `before-labels`.

## What you checked before you said yes

- Each command runs in `wren-street`, not in the course folder.
- `out/` is not in a `.gitignore` file.
- Claude does not delete or move any file.

## What you would say no to

- Claude makes a `.gitignore` with `out/` in it. Then your work is not saved. Say no.
- Claude adds only `CLAUDE.md` and `out/`. Then the originals are not saved. Say no.

Then run `bun run verify make-a-save-point`. All 6 rules pass.
