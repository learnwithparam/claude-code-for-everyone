# How Claude made this answer

Claude Code makes the file. You type one prompt, read what Claude shows, and say yes or no.

## The prompt you type

```text
Make the file wren-street/out/why-i-am-here.md. Put this one sentence in it:
I want Claude to match our delivery notes to the orders so I stop doing it by hand.
```

## The plan Claude showed

Claude is in Manual mode, so it asks first. It shows this:

- It wants to make one new file: `out/why-i-am-here.md`.
- It shows the one sentence it will put in the file.
- It asks: "Do you want to create why-i-am-here.md?"

## What you checked before you said yes

- The file goes in `out/`, not next to Jess's files.
- The sentence is your own task, not the words in brackets.
- Claude makes one file. It does not change any other file.

## What you would say no to

- Claude puts the file in the bakery folder, not in `out/`. Say no, and ask for `out/`.
- Claude keeps "[the task you do by hand at work]". Say no, and tell it your real task.

Then run `bun run verify meet-the-bakery`. All 5 rules pass.
