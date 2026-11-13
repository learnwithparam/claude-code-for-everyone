# How Claude made this answer

Claude Code made the bad edit and the undo log. You undid the edit with rewind.

## The prompts you type

In Claude Code in the terminal, in `wren-street`:

```text
This is a practice edit. I will undo it.
In menu/menu.md, change the Sourdough Loaf price to £4.20.
```

Then you type `/rewind`, pick that prompt, and choose **Restore code**. Then:

```text
Start out/undo-log.md with the heading "Undo log". Add this line:
- menu.md: Claude changed the Sourdough Loaf price to £4.20.
I rewound with /rewind and Restore code. The menu is back to £4.00.
```

## What Claude showed

Claude said the house rules ask it not to change files in place. You said it is a practice edit. Then it showed the change: `£4.00` becomes `£4.20`, and asked. After the rewind, the menu said £4.00 again.

## What you checked

- `menu/menu.md` says £4.00 after the rewind.
- The undo log says what went wrong and how you undid it.

## What you would say no to

- Claude offers to "type the old menu back in". It may change a small thing, like £4.00 to £4. Use rewind instead.

Then run `bun run verify rewind-a-bad-edit`. All 4 rules pass.
