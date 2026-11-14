# How Claude made this answer

Claude Code wrote `CLAUDE.md`. You typed one prompt, read the file, and said yes. This answer comes from a real Claude Code run. We made the words a little plainer.

## The prompt you type

```text
Read notes/owner-notes.md and look at the folders here. Then write
CLAUDE.md at the top of this folder, not in out/. It holds the house
rules for Wren Street Bakery. Use these five headings: About the bakery,
Where things live, Never do, Money rules, How to write. Under Never do,
say: never delete a file, and never change anything in till/ or
purchase-orders/. Say that every new file goes in out/. Keep it short,
under 50 lines, so you will read all of it. Also add one line that says:
one task per chat, and use /clear or a new chat between tasks.
```

## What Claude showed

Claude read the notes and the folder list. Then it asked before it made `CLAUDE.md`. It said it added two rules from Jess's notes: "Never email a cafe without asking Jess first", and "Never change other files in place". It also saw that the till sold a Sourdough Loaf at £4.20, but the menu says £4.00. So it added a money rule: "If two files show two prices, flag it."

## What you checked before you said yes

- The file goes at the top of `wren-street`, not in `out/`.
- Never do names `till/` and `purchase-orders/`.
- Every rule is true. Jess's notes say each one.
- It is about 40 lines long.

## What you would say no to

- Claude wants to save it as `out/CLAUDE.md`. Claude only reads it at the top of the folder. Say no.
- Claude writes 200 lines, with a rule for each cafe and each loaf. Say no. Ask for the rules that matter.
- Claude adds a rule Jess never said, like "Give Kettle and Crumb a discount." Say no.

Then start a new chat, type `/memory`, and run `bun run verify write-the-house-rules`. All 9 rules pass.
