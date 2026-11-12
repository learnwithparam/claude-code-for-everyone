# How Claude made this answer

Claude Code makes the file. You type two prompts, read what Claude shows, and say yes or no.

## The prompts you type

First, in Plan mode:

```text
Look at every folder in this bakery folder. Do not change any file.
Tell me what each folder holds, in one short line each.
Then tell me two things you are not sure about.
```

Then, in Manual mode:

```text
Save what you just told me as out/whats-here.md.
Put one line for each folder. Then add a heading "## Questions I have"
with your two questions under it, each on a line that starts with a dash.
```

## The plan Claude showed

In Plan mode, Claude only reads. It lists the 11 folders, one line each. For example: "orders/: cafe orders from three places, in one messy file."

In Manual mode, it asks before it makes `out/whats-here.md`. It shows you the whole file first.

## What you checked before you said yes

- Every folder is there, from `orders` to `notes`. Count them: 11.
- Each line matches what you see when you open that folder.
- There is a "Questions I have" heading with two questions under it.
- Claude makes one new file in `out/`. It changes nothing else.

## What you would say no to

- Claude wants to fix the dates in the order sheet. Say no. This step only reads.
- The list leaves out `till` or `notes`. Say no, and ask for one line for each folder.

Then run `bun run verify read-the-folder`. All 5 rules pass.
