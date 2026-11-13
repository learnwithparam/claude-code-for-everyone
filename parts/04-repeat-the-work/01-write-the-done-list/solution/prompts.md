# How Claude made this answer

Claude Code wrote the done list and made the save point. You read the list first.

## The prompts you type

```text
Before you make any shelf label, write out/labels-done.md:
a list of checks a person can tick, each line starting with "- [ ]".
At least four checks. One must say the label names sesame when the
recipe has sesame. One must say a person signs the "Checked by:" line.
Do not make any label yet.
```

Then:

```text
Make a save point called done-list.
```

The file `.save-point/done-list-save.txt` shows what git printed: the files in that save point. It has the done list and no label.

## What Claude showed

Claude read one recipe and the allergen list. It wrote five checks. It added one you did not ask for: the price comes from the clean price list, not the menu.

## What you checked before you said yes

- Each check is something a person can see on a label.
- The sesame check names the Multigrain Loaf.
- No label exists yet.

## What you would say no to

- Claude starts to make the labels too. Say no. The list comes first.
- A check like "Claude checked it twice". A person signs, not Claude. Say no.

Then run `bun run verify write-the-done-list`. All 7 rules pass.
