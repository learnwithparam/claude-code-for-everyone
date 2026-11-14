# How Claude made this answer

Claude Code makes both files. You type two prompts, read what Claude shows, and say yes or no.

## The prompts you type

```text
Make the file .claude/settings.json in this folder with this in it:
{
  "permissions": {
    "defaultMode": "default",
    "blockWritesOutsideWorkingDirectories": true,
    "deny": ["Read(../checks/**)"]
  }
}
```

```text
Make out/safety.md. Say that I work in Manual mode. Add a heading
"## Claude will ask me before" and list two things, each on a line
that starts with a dash.
```

## The plan Claude showed

For each file, Claude asks before it writes. It shows the full file. For example, for the settings file it shows the whole file above.

## What you checked before you said yes

- `defaultMode` is `default`. That is the name the file uses for Manual mode.
- `blockWritesOutsideWorkingDirectories` is `true`.
- The `deny` line names `Read(../checks/**)`. It keeps Claude out of the answer key.
- There is no comma after the last line inside a block. A comma there breaks the file.
- `out/safety.md` says Manual mode and lists two things under the heading.

Then you started a new chat. The mode button said **Manual**.

## What you would say no to

- Claude sets `defaultMode` to `auto` or to `manual`. Say no. The word must be `default`.
- Claude adds a comma after `true`. Say no, and ask it to take the comma out.

Then run `bun run verify set-the-safety-rules`. All 7 rules pass.
